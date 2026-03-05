const authBackoffState = new Map();

function getAuthThrottleKey(req) {
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 120);
  return `${req.ip || 'ip'}:${email || 'anonymous'}`;
}

function getAuthBackoffMs(key) {
  const entry = authBackoffState.get(key);
  if (!entry || !entry.failures) return 0;
  return Math.min(8000, 250 * (2 ** Math.max(entry.failures - 1, 0)));
}

function recordAuthFailure(key) {
  const entry = authBackoffState.get(key) || { failures: 0, updatedAt: Date.now() };
  entry.failures += 1;
  entry.updatedAt = Date.now();
  authBackoffState.set(key, entry);
}

function clearAuthFailures(key) {
  authBackoffState.delete(key);
}

async function applyAuthBackoff(req) {
  const key = getAuthThrottleKey(req);
  const delayMs = getAuthBackoffMs(key);
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  return key;
}

module.exports = { applyAuthBackoff, recordAuthFailure, clearAuthFailures, getAuthThrottleKey };
