const axios = require('axios');
const FormData = require('form-data');
const { query } = require('../db');
const {
  normalizeExtractionPayload,
  resolveStoreFromExtraction,
  matchProductFromReceiptLine,
  computeReceiptConfidence
} = require('../receipt-intelligence');

const RECEIPT_PROCESSED_CONFIDENCE_MIN = Number(process.env.RECEIPT_PROCESSED_CONFIDENCE_MIN || 0.62);
const RECEIPT_SCAN_QUALITY_MIN = Number(process.env.RECEIPT_SCAN_QUALITY_MIN || 0.52);

async function fetchVmiReceiptData(vmiUrl) {
  try {
    const resp = await axios.get(vmiUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pricelio/1.0)' }
    });
    const html = resp.data || '';
    return html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 8000);
  } catch (err) {
    console.warn(`VMI URL fetch failed (${vmiUrl}):`, err.message);
    return null;
  }
}

async function processReceiptInline(receiptId, imageBuffer, storeChain) {
  const AI_GATEWAY = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:3001';
  try {
    await query(`UPDATE receipts SET status = 'processing', updated_at = NOW() WHERE id = $1`, [receiptId]);

    const form = new FormData();
    form.append('image', imageBuffer, { filename: 'receipt.jpg', contentType: 'image/jpeg' });
    if (storeChain) form.append('store_chain', storeChain);
    form.append('strict_mode', 'true');
    form.append('scan_mode', 'full_receipt');
    form.append('min_quality_score', String(process.env.RECEIPT_SCAN_MIN_QUALITY || 0.65));
    form.append('language', 'lt');

    const { data } = await axios.post(`${AI_GATEWAY}/extract/receipt`, form, {
      headers: form.getHeaders(),
      timeout: 90000
    });

    const extraction = data?.extraction || {};
    const normalized = normalizeExtractionPayload(extraction);
    const vmiUrl = extraction.vmi_url || null;

    if (vmiUrl && vmiUrl.includes('vmi.lt')) {
      console.log(`VMI QR code found: ${vmiUrl} — fetching official data`);
      const vmiText = await fetchVmiReceiptData(vmiUrl);
      if (vmiText && vmiText.length > 100) {
        await query(`UPDATE receipts SET vmi_url = $1 WHERE id = $2`, [vmiUrl, receiptId]).catch(() => {});
      }
    }

    const resolvedStore = await resolveStoreFromExtraction({
      explicitStoreChain: storeChain,
      extractedStoreName: normalized.store_name,
      extractedStoreAddress: normalized.store_address
    });

    await query(`DELETE FROM receipt_items WHERE receipt_id = $1`, [receiptId]);

    const enrichedLines = [];
    for (const item of normalized.line_items) {
      const match = item.line_type === 'product'
        ? await matchProductFromReceiptLine(item)
        : { matched_product_id: null, match_status: 'unmatched', match_confidence: 0, candidates: [] };

      const row = { ...item, matched_product_id: match.matched_product_id, match_status: match.match_status, match_confidence: match.match_confidence, candidates: match.candidates };
      enrichedLines.push(row);

      await query(
        `INSERT INTO receipt_items (receipt_id, line_number, raw_name, normalized_name, quantity, unit_price, total_price, currency, matched_product_id, match_status, confidence, candidates)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
        [receiptId, row.line_number, row.raw_name.slice(0, 500), row.normalized_name ? row.normalized_name.slice(0, 500) : null, row.quantity, row.unit_price, row.total_price, normalized.currency || 'EUR', row.matched_product_id, row.match_status, row.confidence, JSON.stringify(row.candidates || [])]
      );
    }

    const receiptConfidence = computeReceiptConfidence({ extractionConfidence: normalized.extraction_confidence, lines: enrichedLines });
    const extractionQualityScore = Number(normalized.extraction_quality_score || normalized.extraction_confidence || 0);
    const hasProductLines = enrichedLines.some((line) => line.line_type === 'product');
    const matchedProducts = enrichedLines.filter((line) => line.match_status === 'matched').length;
    const finalStatus = hasProductLines && matchedProducts > 0 && receiptConfidence >= RECEIPT_PROCESSED_CONFIDENCE_MIN && extractionQualityScore >= RECEIPT_SCAN_QUALITY_MIN
      ? 'processed' : 'needs_confirmation';

    await query(
      `UPDATE receipts SET store_id = $2, store_chain = $3, store_raw = $4, receipt_date = COALESCE($5, receipt_date), subtotal = COALESCE($6, subtotal), tax_total = COALESCE($7, tax_total), total = COALESCE($8, total), currency = COALESCE($9, currency), confidence = $10, status = $11, updated_at = NOW() WHERE id = $1`,
      [receiptId, resolvedStore.store_id, resolvedStore.store_chain || null, resolvedStore.store_raw || null, normalized.receipt_date, normalized.subtotal, normalized.tax_total, normalized.total, normalized.currency || 'EUR', receiptConfidence, finalStatus]
    );

    console.log(`Inline receipt processed: ${receiptId} — ${enrichedLines.length} items, ${matchedProducts} matched, confidence ${receiptConfidence}${vmiUrl ? ' (VMI QR verified)' : ''}`);
  } catch (err) {
    console.error(`Inline receipt processing error for ${receiptId}:`, err.message);
    await query(`UPDATE receipts SET status = 'needs_confirmation', updated_at = NOW() WHERE id = $1`, [receiptId]).catch(() => {});
  }
}

module.exports = { processReceiptInline, fetchVmiReceiptData };
