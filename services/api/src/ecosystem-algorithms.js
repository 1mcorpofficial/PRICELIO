function hashStringToPercent(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

function clipOutliersIQR(values) {
  if (!Array.isArray(values) || values.length < 4) {
    return values || [];
  }
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)];
  const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)];
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  return sorted.filter((v) => v >= low && v <= high);
}

function weightedMedian(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  const normalized = items
    .filter((x) => Number.isFinite(Number(x.value)) && Number(x.weight) > 0)
    .map((x) => ({ value: Number(x.value), weight: Number(x.weight) }))
    .sort((a, b) => a.value - b.value);

  if (!normalized.length) {
    return null;
  }

  const totalWeight = normalized.reduce((sum, item) => sum + item.weight, 0);
  const threshold = totalWeight / 2;
  let running = 0;
  for (const item of normalized) {
    running += item.weight;
    if (running >= threshold) {
      return Number(item.value.toFixed(2));
    }
  }
  return Number(normalized[normalized.length - 1].value.toFixed(2));
}

function sourceWeight(sourceType) {
  switch ((sourceType || '').toLowerCase()) {
    case 'receipt':
      return 1.0;
    case 'flyer':
      return 0.85;
    case 'online':
      return 0.75;
    default:
      return 0.6;
  }
}

function recencyDecayFactor(timestamp) {
  if (!timestamp) return 0.7;
  const now = Date.now();
  const ts = new Date(timestamp).getTime();
  if (!Number.isFinite(ts)) return 0.7;
  const days = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24));
  return Math.exp(-days / 30);
}

function computeWeightedTruthPrice(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  const prices = records
    .map((r) => Number(r.price))
    .filter((v) => Number.isFinite(v) && v > 0);
  const clipped = clipOutliersIQR(prices);
  const clippedSet = new Set(clipped.map((v) => v.toFixed(4)));

  const weighted = records
    .filter((r) => clippedSet.has(Number(r.price).toFixed(4)))
    .map((r) => {
      const base = sourceWeight(r.source_type);
      const recency = recencyDecayFactor(r.timestamp || r.created_at || r.updated_at);
      const verifiedBoost = r.is_verified ? 1.2 : 1.0;
      return {
        value: Number(r.price),
        weight: base * recency * verifiedBoost
      };
    });

  return weightedMedian(weighted);
}

function determineRank(rankLevels, lifetimeXp) {
  const xp = Number(lifetimeXp || 0);
  const levels = [...(rankLevels || [])].sort((a, b) => Number(a.min_xp) - Number(b.min_xp));
  let current = levels[0] || null;
  for (const level of levels) {
    if (xp >= Number(level.min_xp)) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

function evaluateConsensus(votes, threshold = 3) {
  const dedup = new Map();
  for (const vote of votes || []) {
    if (vote.trust_value != null && Number(vote.trust_value) < 0) continue;
    dedup.set(vote.user_id, vote.vote);
  }
  let confirms = 0;
  let rejects = 0;
  for (const v of dedup.values()) {
    if (v === 'confirm') confirms += 1;
    if (v === 'reject') rejects += 1;
  }
  if (confirms >= threshold) {
    return { status: 'gold_standard', confirmCount: confirms, rejectCount: rejects };
  }
  if (rejects >= threshold) {
    return { status: 'conflict', confirmCount: confirms, rejectCount: rejects };
  }
  return { status: 'pending', confirmCount: confirms, rejectCount: rejects };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  hashStringToPercent,
  clipOutliersIQR,
  weightedMedian,
  computeWeightedTruthPrice,
  determineRank,
  evaluateConsensus,
  haversineKm
};

