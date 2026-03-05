const crypto = require('crypto');

const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'pricelio_csrf_token';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || process.env.NODE_ENV === 'production').toLowerCase() === 'true';
const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'lax';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

function buildCookieOptions(maxAgeMs) {
  const options = { httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAME_SITE, path: '/', maxAge: maxAgeMs };
  if (COOKIE_DOMAIN) options.domain = COOKIE_DOMAIN;
  return options;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, buildCookieOptions(7 * 24 * 60 * 60 * 1000));
}

function clearRefreshCookie(res) {
  const options = buildCookieOptions(0);
  delete options.maxAge;
  res.clearCookie(REFRESH_COOKIE_NAME, options);
}

function setCsrfCookie(res, value = crypto.randomUUID()) {
  const options = { httpOnly: false, secure: COOKIE_SECURE, sameSite: COOKIE_SAME_SITE, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 };
  if (COOKIE_DOMAIN) options.domain = COOKIE_DOMAIN;
  res.cookie(CSRF_COOKIE_NAME, value, options);
  return value;
}

function validateCsrfToken(req) {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get('x-csrf-token');
  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
}

function shouldReturnRefreshTokenInBody(req) {
  const transport = String(req.get('x-auth-transport') || '').trim().toLowerCase();
  return transport === 'body' || transport === 'token';
}

function buildAuthResponse(req, { accessToken, refreshToken, user }) {
  const payload = { access_token: accessToken, user };
  if (refreshToken && shouldReturnRefreshTokenInBody(req)) payload.refresh_token = refreshToken;
  return payload;
}

module.exports = {
  setRefreshCookie, clearRefreshCookie, setCsrfCookie, validateCsrfToken,
  buildAuthResponse, REFRESH_COOKIE_NAME, CSRF_COOKIE_NAME
};
