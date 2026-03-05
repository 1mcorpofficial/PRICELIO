const auth = require('../auth');
const alerts = require('../alerts');

module.exports = (app) => {
  app.post('/alerts/price', auth.requireUser, async (req, res) => {
    try {
      const { productId, targetPrice } = req.body;
      const alert = await alerts.createPriceAlert(req.user.id, productId, targetPrice);
      res.json(alert);
    } catch (error) {
      console.error('Create alert error:', error);
      res.status(500).json({ error: 'alert_create_failed' });
    }
  });

  app.get('/alerts', auth.requireUser, async (req, res) => {
    try {
      const userAlerts = await alerts.getUserAlerts(req.user.id);
      res.json(userAlerts);
    } catch (error) {
      res.status(500).json({ error: 'alerts_fetch_failed' });
    }
  });

  app.delete('/alerts/:id', auth.requireUser, async (req, res) => {
    try {
      await alerts.deleteAlert(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'alert_delete_failed' });
    }
  });

  app.get('/notifications', auth.requireUser, async (req, res) => {
    try {
      const notifications = await alerts.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'notifications_fetch_failed' });
    }
  });

  app.post('/notifications/:id/read', auth.requireUser, async (req, res) => {
    try {
      await alerts.markNotificationRead(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'notification_update_failed' });
    }
  });
};
