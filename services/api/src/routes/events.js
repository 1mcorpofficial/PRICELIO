const auth = require('../auth');
const sse = require('../sse');
const { trackUiEvent } = require('../helpers/uiEvents');

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';

module.exports = (app) => {
  app.get('/events/price-drops/stream', auth.requireUser, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`retry: 5000\n\n`);
    const clientId = sse.registerClient(res, req.user.id, req.get('last-event-id'));
    req.on('close', () => { sse.unregisterClient(clientId); res.end(); });
  });

  app.get('/events/user/stream', async (req, res) => {
    const authHeader = String(req.get('authorization') || '');
    let userId = null;
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const decoded = auth.verifyToken(token);
      if (decoded?.user_id && decoded?.type === 'access') userId = decoded.user_id;
    }
    if (!userId) {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      if (refreshToken) {
        const verified = await auth.verifyRefreshTokenRecord(refreshToken).catch(() => null);
        if (verified?.user?.id) userId = verified.user.id;
      }
    }
    if (!userId) return res.status(401).json({ error: 'login_required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`retry: 5000\n\n`);
    const clientId = sse.registerClient(res, userId, req.get('last-event-id'));
    req.on('close', () => { sse.unregisterClient(clientId); res.end(); });
  });

  app.post('/events/ui', auth.optionalAuthMiddleware, async (req, res) => {
    try {
      const eventName = String(req.body?.event_name || '').trim();
      if (!eventName) return res.status(400).json({ error: 'event_name_required' });
      const accepted = await trackUiEvent(eventName, req, req.body?.metadata || {});
      if (!accepted) return res.status(400).json({ error: 'event_not_allowed' });
      return res.json({ ok: true, accepted: true });
    } catch (error) {
      return res.status(500).json({ error: 'ui_event_tracking_failed' });
    }
  });
};
