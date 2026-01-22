const { query } = require('./db');

async function updateReceiptStatus(receiptId, status, confidence) {
  await query(
    `UPDATE receipts
     SET status = $1,
         confidence = $2,
         updated_at = now()
     WHERE id = $3`,
    [status, confidence || null, receiptId]
  );
}

async function insertReceiptItems(receiptId, items) {
  if (!items.length) return;
  const values = [];
  const params = [];
  let paramIndex = 1;

  items.forEach((item, index) => {
    values.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
    );
    params.push(
      receiptId,
      index + 1,
      item.raw_name,
      item.normalized_name || null,
      item.quantity || 1,
      item.unit_price || null,
      item.total_price || null,
      item.matched_product_id || null,
      item.match_status || 'unmatched',
      item.confidence || null
    );
  });

  await query(
    `INSERT INTO receipt_items (
      receipt_id,
      line_number,
      raw_name,
      normalized_name,
      quantity,
      unit_price,
      total_price,
      matched_product_id,
      match_status,
      confidence
    )
    VALUES ${values.join(', ')}`,
    params
  );
}

module.exports = {
  updateReceiptStatus,
  insertReceiptItems
};
