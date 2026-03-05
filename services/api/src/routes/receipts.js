const crypto = require('crypto');
const fs = require('fs');
const auth = require('../auth');
const ecosystem = require('../ecosystem');
const sse = require('../sse');
const { query } = require('../db');
const { createReceipt, createReceiptScanFeedback, createGuestSession } = require('../queries');
const { buildVersionedKey, getJson: getCachedJson, setJson: setCachedJson } = require('../cache');
const { getReceiptReport } = require('../queries');
const { upload, ensureUploadPath, statusToProgress } = require('../helpers/upload');
const { processReceiptInline } = require('../helpers/receiptProcessing');
const { trackUiEvent } = require('../helpers/uiEvents');
const { publishReceiptJob } = require('../queue');

const nowIso = () => new Date().toISOString();
const rateLimit = require('express-rate-limit');

const receiptActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_RECEIPTS_MAX || 16),
  message: { error: 'too_many_receipt_requests' },
  standardHeaders: true, legacyHeaders: false
});

function readGuestSessionProof(req) {
  return req.get('x-guest-session-proof') || req.query.guest_proof || req.body?.guest_proof || null;
}

async function enforceReceiptAccess(receipt, req) {
  if (receipt.user_id) {
    if (!req.user?.id) return { ok: false, status: 401, code: 'login_required' };
    if (receipt.user_id !== req.user.id) return { ok: false, status: 403, code: 'receipt_access_denied' };
    return { ok: true, mode: 'user' };
  }
  const proof = readGuestSessionProof(req);
  if (!proof) return { ok: false, status: 401, code: 'guest_proof_required' };
  const decoded = auth.verifyGuestSessionProof(proof);
  if (!decoded || decoded.guest_session_id !== receipt.guest_session_id) return { ok: false, status: 403, code: 'guest_receipt_access_denied' };
  return { ok: true, mode: 'guest' };
}

module.exports = (app) => {
  app.post('/receipts/upload', receiptActionLimiter, auth.optionalAuthMiddleware, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'file_required' });
      await trackUiEvent('first_receipt_scan_started', req, { mime_type: req.file.mimetype || null, size_bytes: req.file.size || null });

      const ext = require('path').extname(req.file.originalname || '.jpg');
      const objectKey = `receipts/${crypto.randomUUID()}${ext || '.jpg'}`;
      const targetPath = ensureUploadPath(objectKey);
      fs.writeFileSync(targetPath, req.file.buffer);

      let userId = null, guestSessionId = null, guestProof = null;
      if (req.user?.id) {
        userId = req.user.id;
      } else {
        const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
        guestSessionId = await createGuestSession(ipHash);
        guestProof = auth.generateGuestSessionProof(guestSessionId);
      }

      const receipt = await createReceipt({ userId, guestSessionId, storeChain: req.body.store_chain, imageObjectKey: objectKey });

      let queuePublished = false;
      try {
        await publishReceiptJob({ receipt_id: receipt.id, object_key: objectKey });
        queuePublished = true;
      } catch (queueErr) {
        console.warn('Queue unavailable, will attempt inline processing:', queueErr.message);
      }

      if (userId) {
        try {
          await ecosystem.awardPoints(userId, { eventType: 'receipt_upload', xp: 10, points: 10, referenceType: 'receipt', referenceId: receipt.id });
        } catch (_) {}
      }

      const hasPriority = userId ? await ecosystem.hasFeature(userId, 'priority_scan').catch(() => false) : false;
      if (!queuePublished) {
        processReceiptInline(receipt.id, req.file.buffer, req.body.store_chain).catch((err) => {
          console.error('Inline receipt processing failed:', err.message);
        });
      }

      res.json({ receipt_id: receipt.id, status: queuePublished ? receipt.status : 'processing', progress: queuePublished ? statusToProgress(receipt.status) : 10, processing_priority: hasPriority ? 'priority' : 'standard', guest_proof: guestProof });
    } catch (error) {
      console.error('Receipt upload failed:', error);
      res.status(500).json({ error: 'receipt_upload_failed' });
    }
  });

  app.get('/receipts/:id/status', auth.optionalAuthMiddleware, async (req, res) => {
    try {
      const receiptResult = await query(`SELECT id, status, user_id, guest_session_id FROM receipts WHERE id = $1 LIMIT 1`, [req.params.id]);
      if (!receiptResult.rows.length) return res.status(404).json({ error: 'receipt_not_found' });
      const receipt = receiptResult.rows[0];
      const access = await enforceReceiptAccess(receipt, req);
      if (!access.ok) return res.status(access.status).json({ error: access.code });

      if (access.mode === 'user' && req.user?.id && ['processed', 'finalized'].includes(String(receipt.status || '').toLowerCase())) {
        sse.broadcastUserEvent({ type: 'receipt_processed', user_id: req.user.id, receipt_id: receipt.id, status: receipt.status, occurred_at: nowIso() }, { userIds: [req.user.id] });
      }
      res.json({ receipt_id: receipt.id, status: receipt.status, progress: statusToProgress(receipt.status) });
    } catch (error) {
      res.status(500).json({ error: 'receipt_status_unavailable' });
    }
  });

  app.get('/receipts/:id/report', auth.optionalAuthMiddleware, async (req, res) => {
    try {
      const receiptResult = await query(`SELECT id, user_id, guest_session_id, status FROM receipts WHERE id = $1 LIMIT 1`, [req.params.id]);
      if (!receiptResult.rows.length) return res.status(404).json({ error: 'receipt_not_found' });
      const receipt = receiptResult.rows[0];
      const access = await enforceReceiptAccess(receipt, req);
      if (!access.ok) return res.status(access.status).json({ error: access.code });

      const cacheKey = await buildVersionedKey('receipt_report', [req.params.id, receipt.status]);
      let payload = await getCachedJson(cacheKey, 'receipt_report');
      if (!payload) {
        const report = await getReceiptReport(req.params.id);
        payload = {
          receipt_id: req.params.id, receipt_status: receipt.status,
          overpaid_items: report.items.filter((item) => item.savings_eur > 0),
          line_items: report.items, savings_total: report.savings_total,
          verified_ratio: report.verified_ratio, summary: report.summary || null
        };
        await setCachedJson(cacheKey, payload, 600, 'receipt_report');
      }

      if (req.user?.id) {
        const hasHighSavingsFind = Array.isArray(payload.line_items) && payload.line_items.some((item) => Number(item.savings_percent || 0) >= 50);
        if (hasHighSavingsFind) {
          await ecosystem.awardPoints(req.user.id, { eventType: 'high_savings_find', xp: 100, points: 100, referenceType: 'receipt', referenceId: req.params.id });
        }
        await trackUiEvent('first_receipt_scan_done', req, { receipt_id: req.params.id, status: receipt.status, savings_total: Number(payload.savings_total || 0) });
      }
      res.json(payload);
    } catch (error) {
      res.status(500).json({ error: 'receipt_report_unavailable' });
    }
  });

  app.post('/receipts/:id/reprocess', receiptActionLimiter, auth.requireUser, async (req, res) => {
    try {
      const receiptResult = await query(`SELECT id, user_id, status, image_object_key, store_chain FROM receipts WHERE id = $1 LIMIT 1`, [req.params.id]);
      if (!receiptResult.rows.length) return res.status(404).json({ error: 'receipt_not_found' });
      const receipt = receiptResult.rows[0];
      if (!receipt.user_id || receipt.user_id !== req.user.id) return res.status(403).json({ error: 'receipt_access_denied' });
      if (!receipt.image_object_key) return res.status(400).json({ error: 'receipt_image_missing' });
      if (receipt.status === 'processing') return res.status(409).json({ error: 'receipt_already_processing' });

      const imagePath = ensureUploadPath(receipt.image_object_key);
      if (!fs.existsSync(imagePath)) return res.status(404).json({ error: 'receipt_image_not_found' });

      const imageBuffer = fs.readFileSync(imagePath);
      await query(`UPDATE receipts SET status = 'processing', updated_at = NOW() WHERE id = $1`, [receipt.id]);
      processReceiptInline(receipt.id, imageBuffer, receipt.store_chain).catch((err) => { console.error('Receipt reprocess failed:', err.message); });

      return res.json({ receipt_id: receipt.id, status: 'processing', progress: statusToProgress('processing') });
    } catch (error) {
      console.error('Receipt reprocess failed:', error);
      return res.status(500).json({ error: 'receipt_reprocess_failed' });
    }
  });

  app.post('/receipts/:id/feedback', auth.optionalAuthMiddleware, async (req, res) => {
    try {
      if (!req.user?.id) return res.status(401).json({ error: 'login_required' });
      const receiptId = req.params.id;
      const receiptLookup = await query(`SELECT id, user_id, status FROM receipts WHERE id = $1 LIMIT 1`, [receiptId]);
      if (!receiptLookup.rows.length) return res.status(404).json({ error: 'receipt_not_found' });
      const receipt = receiptLookup.rows[0];
      if (!receipt.user_id || receipt.user_id !== req.user.id) return res.status(403).json({ error: 'receipt_access_denied' });

      const issueType = String(req.body?.issue_type || 'incorrect_scan').trim().slice(0, 64) || 'incorrect_scan';
      const details = req.body?.details ? String(req.body.details).slice(0, 1000) : null;
      const snapshot = req.body?.snapshot && typeof req.body.snapshot === 'object' ? req.body.snapshot : null;

      const feedback = await createReceiptScanFeedback(receiptId, req.user.id, { issue_type: issueType, details, snapshot });
      await query(`UPDATE receipts SET status = 'needs_confirmation', updated_at = NOW() WHERE id = $1 AND status IN ('processed', 'finalized')`, [receiptId]);
      return res.json({ ok: true, feedback_id: feedback.id, queued_manual_review: true });
    } catch (error) {
      console.error('Receipt feedback failed:', error);
      return res.status(500).json({ error: 'receipt_feedback_failed' });
    }
  });

  app.post('/receipts/:id/confirm', auth.requireUser, async (req, res) => {
    try {
      const { confirmations } = req.body;
      const receiptId = req.params.id;
      if (!confirmations || !Array.isArray(confirmations)) return res.status(400).json({ error: 'invalid_confirmations' });

      const receiptLookup = await query(`SELECT id, user_id FROM receipts WHERE id = $1 LIMIT 1`, [receiptId]);
      if (!receiptLookup.rows.length) return res.status(404).json({ error: 'receipt_not_found' });
      const receipt = receiptLookup.rows[0];
      if (!receipt.user_id || receipt.user_id !== req.user.id) return res.status(403).json({ error: 'receipt_access_denied' });

      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const sanitizedConfirmations = confirmations
        .map((confirmation) => ({
          original_line_id: String(confirmation?.original_line_id || '').trim(),
          corrected_name: String(confirmation?.corrected_name || '').trim(),
          user_confirmed: confirmation?.user_confirmed !== false,
          selected_product_id: confirmation?.selected_product_id ? String(confirmation.selected_product_id).trim() : null
        }))
        .filter((row) => row.original_line_id && row.corrected_name);

      if (!sanitizedConfirmations.length) return res.status(400).json({ error: 'invalid_confirmations_payload' });

      let updatedCount = 0;
      for (const confirmation of sanitizedConfirmations) {
        const { original_line_id, corrected_name, user_confirmed, selected_product_id } = confirmation;
        if (selected_product_id && !uuidPattern.test(selected_product_id)) return res.status(400).json({ error: 'invalid_selected_product_id' });
        const isConfirmedMatch = Boolean(user_confirmed && selected_product_id);
        const updateResult = await query(
          `UPDATE receipt_items SET raw_name = $1, normalized_name = lower($1), confidence = CASE WHEN $2 THEN 1.0 ELSE confidence END, matched_product_id = CASE WHEN $2 THEN $3::uuid WHEN NOT $4 THEN NULL ELSE matched_product_id END, match_status = CASE WHEN $2 THEN 'matched' WHEN $4 THEN 'candidates' ELSE 'unmatched' END WHERE id = $5 AND receipt_id = $6`,
          [corrected_name, isConfirmedMatch, selected_product_id, user_confirmed, original_line_id, receiptId]
        );
        updatedCount += Number(updateResult.rowCount || 0);
      }

      if (!updatedCount) return res.status(400).json({ error: 'no_items_updated' });

      const unresolvedResult = await query(`SELECT COUNT(*)::int AS unresolved_count FROM receipt_items WHERE receipt_id = $1 AND match_status <> 'matched'`, [receiptId]);
      const unresolvedCount = Number(unresolvedResult.rows[0]?.unresolved_count || 0);
      const nextStatus = unresolvedCount > 0 ? 'needs_confirmation' : 'finalized';
      await query(`UPDATE receipts SET status = $2, updated_at = NOW() WHERE id = $1`, [receiptId, nextStatus]);

      res.json({ success: true, confirmed_count: updatedCount, status: nextStatus, unresolved_count: unresolvedCount });
    } catch (error) {
      console.error('Confirmation error:', error);
      res.status(500).json({ error: 'confirmation_failed' });
    }
  });

  app.get('/receipts/:id/nutrition', auth.requireUser, async (req, res) => {
    try {
      const receiptLookup = await query(`SELECT id, user_id FROM receipts WHERE id = $1 LIMIT 1`, [req.params.id]);
      if (!receiptLookup.rows.length) return res.status(404).json({ error: 'receipt_not_found' });
      if (!receiptLookup.rows[0].user_id || receiptLookup.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'receipt_access_denied' });

      const result = await query(`SELECT * FROM receipt_nutritional_analysis WHERE receipt_id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'nutritional_analysis_not_found' });

      const analysis = result.rows[0];
      res.json({
        totals: { calories: parseFloat(analysis.total_calories), protein: parseFloat(analysis.total_protein), carbs: parseFloat(analysis.total_carbs), sugar: parseFloat(analysis.total_sugar), fat: parseFloat(analysis.total_fat), salt: parseFloat(analysis.total_salt), fiber: parseFloat(analysis.total_fiber) },
        harmful_e_additives: analysis.harmful_e_additives,
        allergens: analysis.allergen_warnings,
        health_score: analysis.health_score,
        notes: analysis.analysis_notes ? analysis.analysis_notes.split('\n') : []
      });
    } catch (error) {
      console.error('Nutrition fetch error:', error);
      res.status(500).json({ error: 'nutrition_unavailable' });
    }
  });
};
