const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getClient } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
const BCRYPT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Generate JWT access token
function generateAccessToken(userId, email) {
  return jwt.sign(
    { user_id: userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Generate refresh token
function generateRefreshToken(userId) {
  return jwt.sign(
    { user_id: userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Create guest session
async function createGuestSession(ipHash, deviceHash = null) {
  const client = await getClient();
  
  // Check if active session exists
  const existing = await client.query(
    `SELECT id FROM guest_sessions 
     WHERE ip_hash = $1 
     AND is_active = true 
     AND expires_at > NOW()
     LIMIT 1`,
    [ipHash]
  );
  
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }
  
  // Create new session
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const result = await client.query(
    `INSERT INTO guest_sessions (ip_hash, device_hash, expires_at, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    [ipHash, deviceHash, expiresAt]
  );
  
  return result.rows[0].id;
}

// Register new user
async function registerUser(email, password, cityId = null) {
  const client = await getClient();
  
  // Check if user exists
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  
  if (existing.rows.length > 0) {
    throw new Error('user_exists');
  }
  
  // Create user
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
    created_at: user.created_at
  };
}

// Login user
async function loginUser(email, password) {
  const client = await getClient();

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
  
  // Update last login
  await client.query(
    `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
    [user.id]
  );
  
  return {
    id: user.id,
    email: user.email
  };
}

// Get user profile
async function getUserProfile(userId) {
  const client = await getClient();
  
  const result = await client.query(
    `SELECT id, email, status, created_at, last_login_at
     FROM users WHERE id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('user_not_found');
  }
  
  return result.rows[0];
}

// Auth middleware
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
  
  next();
}

// Optional auth middleware (allows both authenticated and guest users)
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
  
  // Continue regardless of auth status
  next();
}

// Get user or guest session ID
async function getUserOrGuestId(req) {
  if (req.user) {
    return { userId: req.user.id, guestSessionId: null };
  }
  
  // Create or get guest session
  const ipHash = crypto.createHash('sha256')
    .update(req.ip || 'unknown')
    .digest('hex');
  
  const guestSessionId = await createGuestSession(ipHash);
  
  return { userId: null, guestSessionId };
}

module.exports = {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  createGuestSession,
  registerUser,
  loginUser,
  getUserProfile,
  authMiddleware,
  requireUser: authMiddleware,
  optionalAuthMiddleware,
  getUserOrGuestId
};
