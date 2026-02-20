const test = require('node:test');
const assert = require('node:assert/strict');

const { sanitizeExtraction } = require('../services/ai-gateway/src/extractor');

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
  assert.equal(result.confidence, 0.99);
});

