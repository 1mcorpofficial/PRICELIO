const { query } = require('../db');

let adminAuditTableEnsured = false;
async function ensureAdminAuditTable() {
  if (adminAuditTableEnsured) return;
  await query(`CREATE TABLE IF NOT EXISTS admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor text NOT NULL,
    action text NOT NULL,
    target_id text,
    payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await query(`CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log (created_at DESC)`);
  adminAuditTableEnsured = true;
}

async function writeAdminAudit(action, actor, targetId = null, payload = null) {
  await ensureAdminAuditTable();
  await query(
    `INSERT INTO admin_audit_log (actor, action, target_id, payload) VALUES ($1, $2, $3, $4)`,
    [actor, action, targetId, payload ? JSON.stringify(payload) : null]
  );
}

let pendingPricesTableEnsured = false;
async function ensurePendingPricesTable() {
  if (pendingPricesTableEnsured) return;
  await query(`CREATE TABLE IF NOT EXISTS pending_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    chain TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    verified_price DECIMAL(10,2),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ
  )`);
  pendingPricesTableEnsured = true;
}

module.exports = { ensureAdminAuditTable, writeAdminAudit, ensurePendingPricesTable };
