const crypto = require('crypto');

const HEARTBEAT_INTERVAL_MS = Number(process.env.SSE_HEARTBEAT_MS || 20_000);
const EVENT_HISTORY_LIMIT = Number(process.env.SSE_EVENT_HISTORY_LIMIT || 200);

const clients = new Map();
const eventHistory = [];
let eventsSent = 0;

function serializeEvent(event) {
  const id = event.event_id || crypto.randomUUID();
  const type = event.type || 'price_drop';
  const payload = JSON.stringify({ ...event, event_id: id });
  return {
    id,
    wire: `id: ${id}\nevent: ${type}\ndata: ${payload}\n\n`
  };
}

function rememberEvent(event) {
  eventHistory.push(event);
  if (eventHistory.length > EVENT_HISTORY_LIMIT) {
    eventHistory.splice(0, eventHistory.length - EVENT_HISTORY_LIMIT);
  }
}

function replayEventsSince(lastEventId, res) {
  if (!lastEventId) return;
  const index = eventHistory.findIndex((event) => event.id === lastEventId);
  if (index < 0 || index >= eventHistory.length - 1) return;

  for (const event of eventHistory.slice(index + 1)) {
    res.write(event.wire);
    eventsSent += 1;
  }
}

function registerClient(res, userId, lastEventId = null) {
  const clientId = crypto.randomUUID();
  clients.set(clientId, {
    id: clientId,
    userId: String(userId),
    res,
    heartbeat: setInterval(() => {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    }, HEARTBEAT_INTERVAL_MS)
  });

  replayEventsSince(lastEventId, res);

  return clientId;
}

function unregisterClient(clientId) {
  const client = clients.get(clientId);
  if (!client) return;
  clearInterval(client.heartbeat);
  clients.delete(clientId);
}

function broadcastPriceDrop(payload, filter = {}) {
  const event = serializeEvent({
    ...payload,
    type: 'price_drop',
    occurred_at: payload.occurred_at || new Date().toISOString()
  });
  rememberEvent(event);

  const targetUserIds = Array.isArray(filter.userIds)
    ? new Set(filter.userIds.map((value) => String(value)))
    : null;

  for (const client of clients.values()) {
    if (targetUserIds && !targetUserIds.has(client.userId)) {
      continue;
    }
    client.res.write(event.wire);
    eventsSent += 1;
  }

  return event.id;
}

function broadcastUserEvent(payload, filter = {}) {
  const event = serializeEvent({
    ...payload,
    type: payload?.type || 'user_event',
    occurred_at: payload?.occurred_at || new Date().toISOString()
  });
  rememberEvent(event);

  const targetUserIds = Array.isArray(filter.userIds)
    ? new Set(filter.userIds.map((value) => String(value)))
    : null;

  for (const client of clients.values()) {
    if (targetUserIds && !targetUserIds.has(client.userId)) {
      continue;
    }
    client.res.write(event.wire);
    eventsSent += 1;
  }

  return event.id;
}

function getSseStats() {
  return {
    active_clients: clients.size,
    active_connections: clients.size,
    events_sent: eventsSent,
    buffered_events: eventHistory.length,
    heartbeat_ms: HEARTBEAT_INTERVAL_MS
  };
}

module.exports = {
  registerClient,
  unregisterClient,
  broadcastPriceDrop,
  broadcastUserEvent,
  getSseStats
};
