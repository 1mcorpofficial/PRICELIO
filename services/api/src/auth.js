const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getClient } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const GUEST_PROOF_EXPIRES_IN = process.env.GUEST_PROOF_EXPIRES_IN || '2d';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

let refreshTokenTableEnsured = false;

async function ensureRefreshTokenTable(client = null) {
  if (refreshTokenTableEnsured) return;
  const dbClient = client || await getClient();
  const ownsClient = !client;
  try {
    await dbClient.query(
      `CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
         jti text PRIMARY KEY,
         user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         issued_at timestamptz NOT NULL DEFAULT now(),
         expires_at timestamptz NOT NULL,
         revoked_at timestamptz,
         replaced_by_jti text,
         user_agent text,
         ip_hash text,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now()
       )`
    );
    await dbClient.query(
      `CREATE INDEX IF NOT EXISTS auth_refresh_tokens_user_active_idx
       ON auth_refresh_tokens (user_id, revoked_at, expires_at DESC)`
    );
    await dbClient.query(
      `CREATE INDEX IF NOT EXISTS auth_refresh_tokens_expires_idx
       ON auth_refresh_tokens (expires_at)`
    );
    refreshTokenTableEnsured = true;
  } finally {
    if (ownsClient) dbClient.release();
  }
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex');
}

function generateAccessToken(userId, email) {
  return jwt.sign(
    {
      user_id: userId,
      email,
      type: 'access',
      jti: crypto.randomUUID()
    },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(userOrId, email = null) {
  const userId = typeof userOrId === 'object' && userOrId ? userOrId.id : userOrId;
  const userEmail = typeof userOrId === 'object' && userOrId ? userOrId.email : email;
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      user_id: userId,
      email: userEmail || null,
      type: 'refresh',
      jti
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
  return { token, jti };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function generateGuestSessionProof(guestSessionId) {
  return jwt.sign(
    {
      guest_session_id: guestSessionId,
      type: 'guest_session'
    },
    JWT_SECRET,
    { expiresIn: GUEST_PROOF_EXPIRES_IN }
  );
}

function verifyGuestSessionProof(proofToken) {
  const decoded = verifyToken(proofToken);
  if (!decoded || decoded.type !== 'guest_session' || !decoded.guest_session_id) {
    return null;
  }
  return decoded;
}

async function createGuestSession(ipHash, deviceHash = null) {
  const client = await getClient();
  try {
    const existing = await client.query(
      `SELECT id FROM guest_sessions
       WHERE ip_hash = $1
         AND is_active = true
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [ipHash]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const result = await client.query(
      `INSERT INTO guest_sessions (ip_hash, device_hash, expires_at, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [ipHash, deviceHash, expiresAt]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

async function registerUser(email, password, cityId = null) {
  const client = await getClient();
  try {
    const existing = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      throw new Error('user_exists');
    }

    const passwordHash = await hashPassword(password);
    const result = await client.query(
      `INSERT INTO users (email, password_hash, status)
       VALUES ($1, $2, 'active')
       RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      city_id: cityId || null
    };
  } finally {
    client.release();
  }
}

async function loginUser(email, password) {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT id, email, status, password_hash FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new Error('invalid_credentials');
    }

    const valid = await verifyPassword(password, result.rows[0].password_hash);
    if (!valid) {
      throw new Error('invalid_credentials');
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      throw new Error('account_disabled');
    }

    await client.query(
      `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [user.id]
    );

    return {
      id: user.id,
      email: user.email
    };
  } finally {
    client.release();
  }
}

async function getUserProfile(userId) {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT id, email, status, created_at, last_login_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('user_not_found');
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}

async function issueRefreshToken(user, context = {}) {
  const client = await getClient();
  try {
    await ensureRefreshTokenTable(client);
    const { token, jti } = generateRefreshToken(user);
    const decoded = verifyToken(token);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO auth_refresh_tokens (jti, user_id, expires_at, user_agent, ip_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        jti,
        user.id,
        expiresAt,
        context.userAgent ? String(context.userAgent).slice(0, 255) : null,
        context.ip ? hashIp(context.ip) : null
      ]
    );

    return token;
  } finally {
    client.release();
  }
}

async function verifyRefreshTokenRecord(refreshToken, client = null) {
  const decoded = verifyToken(refreshToken);
  if (!decoded || decoded.type !== 'refresh' || !decoded.jti || !decoded.user_id) {
    return null;
  }

  const dbClient = client || await getClient();
  const ownsClient = !client;
  try {
    await ensureRefreshTokenTable(dbClient);

    const result = await dbClient.query(
      `SELECT rt.jti,
              rt.user_id,
              rt.expires_at,
              rt.revoked_at,
              u.email,
              u.status
       FROM auth_refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.jti = $1
       LIMIT 1`,
      [decoded.jti]
    );

    if (!result.rows.length) {
      return null;
    }

    const row = result.rows[0];
    if (row.user_id !== decoded.user_id) {
      return null;
    }
    if (row.status !== 'active') {
      return null;
    }
    if (row.revoked_at) {
      return null;
    }

    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
    if (!expiresAt || expiresAt <= Date.now()) {
      return null;
    }

    return {
      decoded,
      user: {
        id: row.user_id,
        email: row.email
      }
    };
  } finally {
    if (ownsClient) dbClient.release();
  }
}

async function rotateRefreshToken(refreshToken, context = {}) {
  const client = await getClient();
  try {
    await ensureRefreshTokenTable(client);
    await client.query('BEGIN');

    const verified = await verifyRefreshTokenRecord(refreshToken, client);
    if (!verified) {
      await client.query('ROLLBACK');
      return null;
    }

    const oldJti = verified.decoded.jti;
    const { token: nextRefreshToken, jti: nextJti } = generateRefreshToken(verified.user);
    const nextDecoded = verifyToken(nextRefreshToken);
    const nextExpiresAt = nextDecoded?.exp
      ? new Date(nextDecoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await client.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = NOW(),
           replaced_by_jti = $2,
           updated_at = NOW()
       WHERE jti = $1
         AND revoked_at IS NULL`,
      [oldJti, nextJti]
    );

    await client.query(
      `INSERT INTO auth_refresh_tokens (jti, user_id, expires_at, user_agent, ip_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        nextJti,
        verified.user.id,
        nextExpiresAt,
        context.userAgent ? String(context.userAgent).slice(0, 255) : null,
        context.ip ? hashIp(context.ip) : null
      ]
    );

    await client.query('COMMIT');
    return {
      user: verified.user,
      refreshToken: nextRefreshToken
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // ignore rollback failure
    }
    throw error;
  } finally {
    client.release();
  }
}

async function revokeRefreshToken(refreshToken) {
  const decoded = verifyToken(refreshToken);
  if (!decoded || decoded.type !== 'refresh' || !decoded.jti) {
    return false;
  }

  const client = await getClient();
  try {
    await ensureRefreshTokenTable(client);
    const result = await client.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = COALESCE(revoked_at, NOW()),
           updated_at = NOW()
       WHERE jti = $1`,
      [decoded.jti]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

async function revokeUserRefreshTokens(userId) {
  const client = await getClient();
  try {
    await ensureRefreshTokenTable(client);
    await client.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = COALESCE(revoked_at, NOW()),
           updated_at = NOW()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [userId]
    );
  } finally {
    client.release();
  }
}

async function issueAuthTokens(user, context = {}) {
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = await issueRefreshToken(user, context);
  return { accessToken, refreshToken };
}

async function refreshAuthTokens(refreshToken, context = {}) {
  const rotated = await rotateRefreshToken(refreshToken, context);
  if (!rotated) {
    return null;
  }

  const accessToken = generateAccessToken(rotated.user.id, rotated.user.email);
  return {
    accessToken,
    refreshToken: rotated.refreshToken,
    user: rotated.user
  };
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded || decoded.type !== 'access') {
    return res.status(401).json({ error: 'invalid_token' });
  }

  req.user = {
    id: decoded.user_id,
    email: decoded.email
  };

  return next();
}

function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded && decoded.type === 'access') {
      req.user = {
        id: decoded.user_id,
        email: decoded.email
      };
    }
  }

  return next();
}

async function getUserOrGuestId(req) {
  if (req.user) {
    return { userId: req.user.id, guestSessionId: null };
  }

  const guestSessionId = await createGuestSession(hashIp(req.ip || 'unknown'));
  return { userId: null, guestSessionId };
}

module.exports = {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateGuestSessionProof,
  verifyGuestSessionProof,
  createGuestSession,
  registerUser,
  loginUser,
  getUserProfile,
  issueAuthTokens,
  refreshAuthTokens,
  issueRefreshToken,
  verifyRefreshTokenRecord,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeUserRefreshTokens,
  authMiddleware,
  requireUser: authMiddleware,
  optionalAuthMiddleware,
  getUserOrGuestId
};
