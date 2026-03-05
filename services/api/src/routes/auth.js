const crypto = require('crypto');
const auth = require('../auth');
const ecosystem = require('../ecosystem');
const { createGuestSession } = require('../queries');
const { setRefreshCookie, clearRefreshCookie, setCsrfCookie, validateCsrfToken, buildAuthResponse, REFRESH_COOKIE_NAME } = require('../helpers/cookies');
const { applyAuthBackoff, recordAuthFailure, clearAuthFailures } = require('../helpers/authBackoff');
const { trackUiEvent } = require('../helpers/uiEvents');

module.exports = (app) => {
  app.post('/auth/guest', async (req, res) => {
    try {
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      const guestSessionId = await auth.createGuestSession(ipHash);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const guestProof = auth.generateGuestSessionProof(guestSessionId);
      res.json({ id: guestSessionId, expires_at: expiresAt.toISOString(), guest_proof: guestProof });
    } catch (error) {
      res.status(500).json({ error: 'guest_session_failed' });
    }
  });

  app.post('/auth/register', async (req, res) => {
    const authKey = await applyAuthBackoff(req);
    try {
      await trackUiEvent('auth_register_submit', req, { flow: 'email_password' });
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'email_password_required' });
      if (password.length < 8) return res.status(400).json({ error: 'password_too_short' });

      const user = await auth.registerUser(email, password);
      await ecosystem.getGamification(user.id);
      const { accessToken, refreshToken } = await auth.issueAuthTokens(user, { userAgent: req.get('user-agent'), ip: req.ip });
      setRefreshCookie(res, refreshToken);
      setCsrfCookie(res);
      clearAuthFailures(authKey);
      res.json(buildAuthResponse(req, { accessToken, refreshToken, user: { id: user.id, email: user.email } }));
      await trackUiEvent('auth_register_success', req, { user_id: user.id });
    } catch (error) {
      if (error.message === 'user_exists') { recordAuthFailure(authKey); return res.status(409).json({ error: 'user_exists' }); }
      recordAuthFailure(authKey);
      res.status(500).json({ error: 'registration_failed' });
    }
  });

  app.post('/auth/login', async (req, res) => {
    const authKey = await applyAuthBackoff(req);
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'email_password_required' });
      const user = await auth.loginUser(email, password);
      const { accessToken, refreshToken } = await auth.issueAuthTokens(user, { userAgent: req.get('user-agent'), ip: req.ip });
      setRefreshCookie(res, refreshToken);
      setCsrfCookie(res);
      clearAuthFailures(authKey);
      res.json(buildAuthResponse(req, { accessToken, refreshToken, user: { id: user.id, email: user.email } }));
    } catch (error) {
      if (error.message === 'invalid_credentials' || error.message === 'account_disabled') {
        recordAuthFailure(authKey);
        return res.status(401).json({ error: error.message });
      }
      recordAuthFailure(authKey);
      res.status(500).json({ error: 'login_failed' });
    }
  });

  app.post('/auth/refresh', async (req, res) => {
    try {
      const refreshTokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
      const refreshTokenFromBody = req.body?.refresh_token;
      const refreshToken = refreshTokenFromCookie || refreshTokenFromBody;
      if (!refreshToken) return res.status(400).json({ error: 'refresh_token_required' });
      if (refreshTokenFromCookie && !validateCsrfToken(req)) return res.status(403).json({ error: 'csrf_validation_failed' });

      const refreshed = await auth.refreshAuthTokens(refreshToken, { userAgent: req.get('user-agent'), ip: req.ip });
      if (!refreshed) return res.status(401).json({ error: 'invalid_refresh_token' });

      setRefreshCookie(res, refreshed.refreshToken);
      setCsrfCookie(res);
      res.json(buildAuthResponse(req, { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, user: refreshed.user }));
    } catch (error) {
      res.status(401).json({ error: 'token_refresh_failed' });
    }
  });

  app.post('/auth/logout', async (req, res) => {
    const refreshTokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
    const refreshTokenFromBody = req.body?.refresh_token;
    if (refreshTokenFromCookie && !validateCsrfToken(req)) return res.status(403).json({ error: 'csrf_validation_failed' });
    const refreshToken = refreshTokenFromCookie || refreshTokenFromBody;
    if (refreshToken) await auth.revokeRefreshToken(refreshToken).catch(() => false);
    clearRefreshCookie(res);
    res.status(204).send();
  });
};
