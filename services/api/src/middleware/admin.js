const { query } = require('../db');

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

async function requireAdminAccess(req, res, next) {
  if (ADMIN_API_KEY && req.get('x-admin-key') === ADMIN_API_KEY) {
    req.adminContext = { type: 'api_key', actor: 'admin-key' };
    return next();
  }
  if (!req.user?.id || !req.user?.email) {
    return res.status(401).json({ error: 'admin_auth_required' });
  }
  try {
    const result = await query(
      `SELECT id, email FROM admin_users WHERE LOWER(email) = LOWER($1) AND status = 'active' LIMIT 1`,
      [req.user.email]
    );
    if (!result.rows.length) return res.status(403).json({ error: 'admin_access_denied' });
    req.adminContext = { type: 'user', actor: result.rows[0].email, admin_id: result.rows[0].id };
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'admin_check_failed' });
  }
}

module.exports = { requireAdminAccess };
