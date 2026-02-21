const Redis = require('ioredis');

const CACHE_VERSION_KEY = 'pricelio:cache_version';
const LOCAL_VERSION_TTL_MS = 30_000;

let redisClient = null;
let redisInitAttempted = false;
let cachedVersion = null;
let cachedVersionAt = 0;

const metrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  byNamespace: Object.create(null)
};

function incrementNamespaceMetric(namespace, key) {
  const ns = String(namespace || 'default');
  if (!metrics.byNamespace[ns]) {
    metrics.byNamespace[ns] = { hits: 0, misses: 0, errors: 0 };
  }
  metrics.byNamespace[ns][key] += 1;
}

function getRedisConfig() {
  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true
    };
  }

  const host = process.env.REDIS_HOST;
  if (!host) {
    return null;
  }

  return {
    host,
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true
  };
}

function getRedisClient() {
  if (redisClient) return redisClient;
  if (redisInitAttempted) return null;

  redisInitAttempted = true;
  const config = getRedisConfig();
  if (!config) {
    return null;
  }

  redisClient = new Redis(config);
  redisClient.on('error', (error) => {
    metrics.errors += 1;
    incrementNamespaceMetric('redis', 'errors');
    console.error('Redis error:', error.message);
  });

  return redisClient;
}

async function ensureRedisConnection() {
  const client = getRedisClient();
  if (!client) return null;

  if (client.status === 'ready' || client.status === 'connect') {
    return client;
  }

  try {
    await client.connect();
    return client;
  } catch (error) {
    metrics.errors += 1;
    incrementNamespaceMetric('redis', 'errors');
    console.error('Redis connect failed:', error.message);
    return null;
  }
}

async function getCacheVersion() {
  const now = Date.now();
  if (cachedVersion != null && now - cachedVersionAt < LOCAL_VERSION_TTL_MS) {
    return cachedVersion;
  }

  const client = await ensureRedisConnection();
  if (!client) {
    cachedVersion = Number(process.env.CACHE_VERSION || 1);
    cachedVersionAt = now;
    return cachedVersion;
  }

  try {
    let value = await client.get(CACHE_VERSION_KEY);
    if (!value) {
      value = '1';
      await client.set(CACHE_VERSION_KEY, value);
    }
    cachedVersion = Number(value) || 1;
    cachedVersionAt = now;
    return cachedVersion;
  } catch (error) {
    metrics.errors += 1;
    incrementNamespaceMetric('version', 'errors');
    cachedVersion = Number(process.env.CACHE_VERSION || 1);
    cachedVersionAt = now;
    return cachedVersion;
  }
}

function normalizePart(value) {
  if (value == null || value === '') return 'na';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'na';
    return String(value);
  }
  return encodeURIComponent(String(value).trim().toLowerCase());
}

async function buildVersionedKey(namespace, parts = []) {
  const version = await getCacheVersion();
  const normalizedParts = parts.map(normalizePart).join(':');
  return `v${version}:${namespace}:${normalizedParts}`;
}

async function getJson(key, namespace = 'default') {
  const client = await ensureRedisConnection();
  if (!client) {
    metrics.misses += 1;
    incrementNamespaceMetric(namespace, 'misses');
    return null;
  }

  try {
    const raw = await client.get(key);
    if (!raw) {
      metrics.misses += 1;
      incrementNamespaceMetric(namespace, 'misses');
      return null;
    }
    metrics.hits += 1;
    incrementNamespaceMetric(namespace, 'hits');
    return JSON.parse(raw);
  } catch (error) {
    metrics.errors += 1;
    incrementNamespaceMetric(namespace, 'errors');
    return null;
  }
}

async function setJson(key, value, ttlSeconds, namespace = 'default') {
  const client = await ensureRedisConnection();
  if (!client) return;

  try {
    const payload = JSON.stringify(value);
    if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
      await client.setex(key, ttlSeconds, payload);
      return;
    }
    await client.set(key, payload);
  } catch (error) {
    metrics.errors += 1;
    incrementNamespaceMetric(namespace, 'errors');
  }
}

async function bumpCacheVersion() {
  const client = await ensureRedisConnection();
  if (!client) {
    cachedVersion = (cachedVersion || Number(process.env.CACHE_VERSION || 1)) + 1;
    cachedVersionAt = Date.now();
    return cachedVersion;
  }

  try {
    const next = await client.incr(CACHE_VERSION_KEY);
    cachedVersion = Number(next) || 1;
    cachedVersionAt = Date.now();
    return cachedVersion;
  } catch (error) {
    metrics.errors += 1;
    incrementNamespaceMetric('version', 'errors');
    return cachedVersion || 1;
  }
}

function getCacheMetrics() {
  const total = metrics.hits + metrics.misses;
  return {
    enabled: Boolean(getRedisConfig()),
    hits: metrics.hits,
    misses: metrics.misses,
    errors: metrics.errors,
    hit_ratio: total > 0 ? Number((metrics.hits / total).toFixed(3)) : 0,
    by_namespace: metrics.byNamespace,
    cache_version: cachedVersion || 1
  };
}

module.exports = {
  buildVersionedKey,
  getJson,
  setJson,
  bumpCacheVersion,
  getCacheMetrics,
  ensureRedisConnection
};
