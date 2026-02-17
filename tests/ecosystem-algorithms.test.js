const test = require('node:test');
const assert = require('node:assert/strict');

const {
  weightedMedian,
  computeWeightedTruthPrice,
  determineRank,
  evaluateConsensus
} = require('../services/api/src/ecosystem-algorithms');

test('weightedMedian returns median by cumulative weight', () => {
  const result = weightedMedian([
    { value: 1.0, weight: 1 },
    { value: 2.0, weight: 2 },
    { value: 3.0, weight: 1 }
  ]);
  assert.equal(result, 2.0);
});

test('computeWeightedTruthPrice clips outliers and returns stable truth price', () => {
  const now = new Date().toISOString();
  const price = computeWeightedTruthPrice([
    { price: 2.0, source_type: 'receipt', timestamp: now, is_verified: true },
    { price: 2.1, source_type: 'flyer', timestamp: now, is_verified: false },
    { price: 2.05, source_type: 'online', timestamp: now, is_verified: false },
    { price: 99.0, source_type: 'online', timestamp: now, is_verified: false }
  ]);
  assert.equal(price >= 2.0 && price <= 2.1, true);
});

test('determineRank picks highest rank not exceeding xp', () => {
  const rank = determineRank(
    [
      { level: 1, rank_name: 'L1', min_xp: 0 },
      { level: 2, rank_name: 'L2', min_xp: 100 },
      { level: 3, rank_name: 'L3', min_xp: 300 }
    ],
    250
  );
  assert.equal(rank.level, 2);
});

test('evaluateConsensus reaches gold at three confirm votes', () => {
  const consensus = evaluateConsensus([
    { user_id: 'u1', vote: 'confirm', trust_value: 0 },
    { user_id: 'u2', vote: 'confirm', trust_value: 1 },
    { user_id: 'u3', vote: 'confirm', trust_value: 2 }
  ], 3);
  assert.equal(consensus.status, 'gold_standard');
  assert.equal(consensus.confirmCount, 3);
});

test('evaluateConsensus reaches conflict at three reject votes', () => {
  const consensus = evaluateConsensus([
    { user_id: 'u1', vote: 'reject', trust_value: 0 },
    { user_id: 'u2', vote: 'reject', trust_value: 1 },
    { user_id: 'u3', vote: 'reject', trust_value: 2 }
  ], 3);
  assert.equal(consensus.status, 'conflict');
  assert.equal(consensus.rejectCount, 3);
});
