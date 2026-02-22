const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sanitizeExtraction,
  evaluateExtractionQuality
} = require('../services/ai-gateway/src/extractor');

test('sanitizeExtraction filters summary-only lines and keeps product lines', () => {
  const result = sanitizeExtraction({
    confidence: 0.92,
    line_items: [
      { raw_name: 'PIENAS 2.5%', total_price: 1.59 },
      { raw_name: 'VISO MOKETI', total_price: null },
      { raw_name: 'PVM 21%', total_price: null }
    ]
  });

  assert.equal(result.line_items.length, 1);
  assert.equal(result.line_items[0].raw_name, 'PIENAS 2.5%');
});

test('sanitizeExtraction normalizes invalid quantity and confidence', () => {
  const result = sanitizeExtraction({
    confidence: 5,
    line_items: [
      { raw_name: 'DUONA', quantity: 0, unit_price: 1.25, total_price: 1.25 }
    ]
  });

  assert.equal(result.line_items[0].quantity, 1);
  assert.equal(result.confidence, 1);
});

test('sanitizeExtraction drops numeric/noise rows and keeps valid priced products', () => {
  const result = sanitizeExtraction({
    line_items: [
      { raw_name: '12345 2.99', total_price: 2.99 },
      { raw_name: 'DUONA TOST', total_price: 1.79 }
    ]
  });

  assert.equal(result.line_items.length, 1);
  assert.equal(result.line_items[0].raw_name, 'DUONA TOST');
});

test('evaluateExtractionQuality flags mismatch between line sum and total', () => {
  const data = sanitizeExtraction({
    store_name: 'Maxima',
    receipt_date: '2026-02-20',
    total: 15.0,
    line_items: [
      { raw_name: 'PIENAS', total_price: 1.5 },
      { raw_name: 'DUONA', total_price: 2.0 }
    ]
  });

  const quality = evaluateExtractionQuality(data);
  assert.equal(quality.qualityFlags.includes('line_sum_mismatch'), true);
  assert.equal(quality.qualityScore < 0.9, true);
});
