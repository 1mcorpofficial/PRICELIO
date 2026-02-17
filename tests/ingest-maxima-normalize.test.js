const test = require('node:test');
const assert = require('node:assert/strict');

const maxima = require('../services/ingest/src/connectors/maxima');

test('maxima normalize maps offer to canonical schema', async () => {
  const normalized = await maxima.normalize({
    offers: [
      {
        product_name: '  Obuoliai 1kg ',
        price: 1.99,
        old_price: 2.49,
        unit_price: 1.99,
        unit_price_unit: 'kg',
        valid_from: '2026-02-01',
        valid_to: '2026-02-07',
        category: 'Fruit',
        raw_data: { id: 'x1' }
      }
    ]
  });

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].product_name, 'Obuoliai 1kg');
  assert.equal(normalized[0].price_value, 1.99);
  assert.equal(normalized[0].old_price_value, 2.49);
  assert.equal(normalized[0].discount_percent, 20);
  assert.equal(normalized[0].unit_price_unit, 'kg');
  assert.equal(normalized[0].category, 'Fruit');
});

