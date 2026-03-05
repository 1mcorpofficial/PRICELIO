const latencyByEndpoint = new Map();

function normalizeLatencyPath(rawPath) {
  return String(rawPath || '/')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/ig, ':id')
    .replace(/\/\d+/g, '/:id');
}

function trackEndpointLatency(label, durationMs) {
  const key = String(label || 'unknown');
  const list = latencyByEndpoint.get(key) || [];
  list.push(durationMs);
  if (list.length > 200) list.splice(0, list.length - 200);
  latencyByEndpoint.set(key, list);
}

function computeP95(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Number(sorted[index].toFixed(2));
}

function getLatencySummary() {
  const summary = {};
  for (const [endpoint, values] of latencyByEndpoint.entries()) {
    summary[endpoint] = { samples: values.length, p95_ms: computeP95(values) };
  }
  return summary;
}

module.exports = { normalizeLatencyPath, trackEndpointLatency, getLatencySummary };
