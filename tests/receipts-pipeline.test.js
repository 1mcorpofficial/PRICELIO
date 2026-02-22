const test = require('node:test');
const assert = require('node:assert/strict');

const pipeline = require('../services/receipts/src/pipeline');

test('validateUpload rejects oversized files and invalid mime type', () => {
  const result = pipeline.validateUpload({
    file_size: 11 * 1024 * 1024,
    mime_type: 'application/pdf'
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.reasons.sort(), ['file_too_large', 'invalid_file_type'].sort());
});

test('scoreConfidence calculates weighted confidence', () => {
  const score = pipeline.scoreConfidence([
    { confidence: 0.9, match_confidence: 0.8 },
    { confidence: 0.7, match_confidence: 0.6 }
  ]);

  assert.equal(score.extraction_confidence, 0.8);
  assert.equal(score.matching_confidence, 0.7);
  assert.equal(score.receipt_confidence, 0.76);
});

test('scoreConfidence ignores discount lines when product lines exist', () => {
  const score = pipeline.scoreConfidence([
    { line_type: 'product', confidence: 0.9, match_confidence: 0.8 },
    { line_type: 'discount', confidence: 0.1, match_confidence: 0.0 }
  ]);

  assert.equal(score.extraction_confidence, 0.9);
  assert.equal(score.matching_confidence, 0.8);
  assert.equal(score.receipt_confidence, 0.86);
});
