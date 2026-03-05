const { query } = require('../db');

const nowIso = () => new Date().toISOString();

module.exports = (app) => {
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: nowIso() });
  });

  app.post('/waitlist', async (req, res) => {
    const { email } = req.body || {};
    if (!email || !String(email).includes('@')) {
      return res.status(400).json({ error: 'invalid_email' });
    }
    try {
      await query(
        `INSERT INTO waitlist_emails (email, created_at) VALUES ($1, NOW()) ON CONFLICT (email) DO UPDATE SET updated_at = NOW()`,
        [String(email).trim().toLowerCase().slice(0, 254)]
      );
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: true });
    }
  });
};
