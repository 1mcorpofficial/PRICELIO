const auth = require('../auth');
const { query } = require('../db');
const { bumpCacheVersion, getCacheMetrics } = require('../cache');
const { getLatencySummary } = require('../helpers/latency');
const { requireAdminAccess } = require('../middleware/admin');
const { fetchIngestConnectors, forceRunIngestConnector, fetchIngestHealth } = require('../helpers/ingest');
const { ensureAdminAuditTable, writeAdminAudit } = require('../helpers/adminDb');
const sse = require('../sse');
const os = require('os');

module.exports = (app) => {
  app.get('/admin/scrapers/status', auth.optionalAuthMiddleware, requireAdminAccess, async (req, res) => {
    try {
      const connectors = await fetchIngestConnectors();
      const now = Date.now();
      const rows = connectors.map((connector) => {
        const lastRun = connector.last_run || connector.lastRun || null;
        const lastRunMs = lastRun ? new Date(lastRun).getTime() : null;
        const stale = !lastRunMs || now - lastRunMs > 12 * 60 * 60 * 1000;
        const sourceStatus = String(connector.last_status || connector.lastStatus || '').toLowerCase();
        const status = sourceStatus === 'failed' ? 'error' : stale ? 'warning' : 'healthy';
        return { id: connector.id, name: connector.name, chain: connector.chain || null, type: connector.type || null, enabled: connector.enabled !== false, status, last_run: lastRun, source_status: sourceStatus || null };
      });
      return res.json(rows);
    } catch (error) {
      try {
        const fallback = await query(
          `SELECT COALESCE(store_chain, 'unknown') AS chain, COUNT(*)::int AS offers_count, MAX(updated_at) AS last_updated_at
           FROM offers WHERE status = 'active' GROUP BY COALESCE(store_chain, 'unknown') ORDER BY chain ASC`
        );
        return res.json(fallback.rows.map((row) => ({
          id: String(row.chain || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: row.chain, chain: row.chain, type: 'offer_ingest', enabled: true,
          status: row.last_updated_at ? 'warning' : 'error',
          last_run: row.last_updated_at, source_status: 'db_fallback', offers_count: row.offers_count
        })));
      } catch (fallbackError) {
        return res.status(500).json({ error: 'admin_scraper_status_failed' });
      }
    }
  });

  app.get('/admin/system/health', auth.optionalAuthMiddleware, requireAdminAccess, async (req, res) => {
    try {
      const [dbHealth, ingestHealth] = await Promise.allSettled([
        query('SELECT NOW() AS db_now'),
        fetchIngestHealth()
      ]);
      const memory = process.memoryUsage();
      const redisMetrics = getCacheMetrics();
      const latency = getLatencySummary();
      const sseStats = sse.getSseStats();

      const queueLag = await query(
        `SELECT COUNT(*)::int AS queued FROM receipts WHERE status IN ('uploaded', 'processing')`
      ).catch(() => ({ rows: [{ queued: null }] }));

      return res.json({
        api: { uptime_seconds: Number(process.uptime().toFixed(1)), pid: process.pid, node: process.version },
        system: { load_avg: os.loadavg(), total_mem_mb: Math.round(os.totalmem() / 1024 / 1024), free_mem_mb: Math.round(os.freemem() / 1024 / 1024) },
        process: { rss_mb: Math.round(memory.rss / 1024 / 1024), heap_used_mb: Math.round(memory.heapUsed / 1024 / 1024), heap_total_mb: Math.round(memory.heapTotal / 1024 / 1024) },
        database: { status: dbHealth.status === 'fulfilled' ? 'ok' : 'error', time: dbHealth.status === 'fulfilled' ? dbHealth.value.rows[0]?.db_now : null },
        ingest: ingestHealth.status === 'fulfilled' ? ingestHealth.value : { status: 'unreachable' },
        queue: { receipt_queue_lag: Number(queueLag.rows[0]?.queued ?? 0) },
        cache: redisMetrics, latency, realtime: sseStats
      });
    } catch (error) {
      return res.status(500).json({ error: 'admin_system_health_failed' });
    }
  });

  app.get('/admin/audit-log', auth.optionalAuthMiddleware, requireAdminAccess, async (req, res) => {
    try {
      await ensureAdminAuditTable();
      const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
      const result = await query(`SELECT id, actor, action, target_id, payload, created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT $1`, [limit]);
      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error: 'admin_audit_log_failed' });
    }
  });

  app.post('/admin/scrapers/:id/force-sync', auth.optionalAuthMiddleware, requireAdminAccess, async (req, res) => {
    try {
      const connectorId = String(req.params.id || '').trim();
      if (!connectorId) return res.status(400).json({ error: 'connector_id_required' });
      const result = await forceRunIngestConnector(connectorId);
      const nextCacheVersion = await bumpCacheVersion();
      await writeAdminAudit('force_sync', req.adminContext?.actor || 'unknown', connectorId, { result, cache_version: nextCacheVersion, trace_id: req.traceId }).catch(() => {});
      return res.json({ ok: true, connector_id: connectorId, cache_version: nextCacheVersion, ingest_result: result });
    } catch (error) {
      return res.status(500).json({ error: 'admin_force_sync_failed' });
    }
  });
};
