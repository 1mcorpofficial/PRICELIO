/**
 * Personalized Alerts System
 * Handles price drop alerts, basket ready notifications, and deal alerts
 */

const { query } = require('./db');

/**
 * Alert types:
 * - PRICE_DROP: When a favorite product price drops
 * - BASKET_READY: When basket items are on sale
 * - DEAL_ALERT: When new deals match user preferences
 * - EXPIRING_SOON: When deals are about to expire
 */

/**
 * Create a new price alert
 */
async function createPriceAlert(userId, productId, targetPrice, alertType = 'PRICE_DROP') {
  const result = await query(
    `INSERT INTO user_alerts (user_id, product_id, alert_type, target_price, is_active, created_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     RETURNING *`,
    [userId, productId, alertType, targetPrice]
  );
  
  return result.rows[0];
}

/**
 * Get user's active alerts
 */
async function getUserAlerts(userId) {
  const result = await query(
    `SELECT a.*, p.name as product_name, p.brand
     FROM user_alerts a
     JOIN products p ON p.id = a.product_id
     WHERE a.user_id = $1 AND a.is_active = true
     ORDER BY a.created_at DESC`,
    [userId]
  );
  
  return result.rows;
}

/**
 * Check for triggered alerts
 */
async function checkTriggeredAlerts() {
  // Find price drops
  const priceDrops = await query(
    `SELECT a.*, p.name as product_name, o.price_value as current_price, o.store_chain
     FROM user_alerts a
     JOIN products p ON p.id = a.product_id
     JOIN offers o ON o.product_id = a.product_id
     WHERE a.is_active = true 
       AND a.alert_type = 'PRICE_DROP'
       AND o.price_value <= a.target_price
       AND o.status = 'active'
       AND a.last_triggered_at < NOW() - INTERVAL '24 hours' OR a.last_triggered_at IS NULL
     ORDER BY o.price_value ASC`
  );
  
  const triggered = [];
  
  for (const alert of priceDrops.rows) {
    // Send notification
    await sendNotification(alert.user_id, {
      type: 'PRICE_DROP',
      title: `💰 Kainos Kritimas!`,
      message: `${alert.product_name} dabar tik €${alert.current_price} ${alert.store_chain} parduotuvėje!`,
      productId: alert.product_id,
      price: alert.current_price,
      store: alert.store_chain
    });
    
    // Update last triggered
    await query(
      `UPDATE user_alerts SET last_triggered_at = NOW() WHERE id = $1`,
      [alert.id]
    );
    
    triggered.push(alert);
  }
  
  return triggered;
}

/**
 * Check basket alerts - notify when basket items are on sale
 */
async function checkBasketAlerts(userId) {
  const basketItems = await query(
    `SELECT bi.*, p.name as product_name, p.id as product_id
     FROM basket_items bi
     JOIN baskets b ON b.id = bi.basket_id
     JOIN products p ON p.id = bi.product_id
     WHERE b.user_id = $1 AND b.status = 'active'`,
    [userId]
  );
  
  const alerts = [];
  
  for (const item of basketItems.rows) {
    // Check for deals on this product
    const deals = await query(
      `SELECT * FROM offers 
       WHERE product_id = $1 AND status = 'active' 
       AND old_price_value IS NOT NULL 
       AND old_price_value > price_value
       ORDER BY price_value ASC LIMIT 1`,
      [item.product_id]
    );
    
    if (deals.rows.length > 0) {
      const deal = deals.rows[0];
      const savings = deal.old_price_value - deal.price_value;
      const savingsPercent = ((savings / deal.old_price_value) * 100).toFixed(0);
      
      alerts.push({
        product: item.product_name,
        store: deal.store_chain,
        oldPrice: deal.old_price_value,
        newPrice: deal.price_value,
        savings,
        savingsPercent
      });
    }
  }
  
  if (alerts.length > 0) {
    await sendNotification(userId, {
      type: 'BASKET_READY',
      title: '🛒 Jūsų Krepšelis Akcijoje!',
      message: `${alerts.length} produktų iš jūsų krepšelio dabar akcijoje! Sutaupykite iki ${alerts.reduce((sum, a) => sum + a.savings, 0).toFixed(2)}€`,
      alerts
    });
  }
  
  return alerts;
}

/**
 * Check for expiring deals
 */
async function checkExpiringDeals() {
  const expiringSoon = await query(
    `SELECT o.*, p.name as product_name, p.brand
     FROM offers o
     JOIN products p ON p.id = o.product_id
     WHERE o.status = 'active'
       AND o.valid_to > NOW()
       AND o.valid_to < NOW() + INTERVAL '2 days'
       AND o.old_price_value IS NOT NULL
       AND o.old_price_value > o.price_value
     ORDER BY (o.old_price_value - o.price_value) DESC
     LIMIT 20`
  );
  
  return expiringSoon.rows;
}

/**
 * Send notification (placeholder - implement with actual push/email service)
 */
async function sendNotification(userId, notification) {
  console.log(`📧 Notification for user ${userId}:`, notification);
  
  // Store notification in database
  await query(
    `INSERT INTO notifications (user_id, type, title, message, data, created_at, is_read)
     VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
    [
      userId,
      notification.type,
      notification.title,
      notification.message,
      JSON.stringify(notification)
    ]
  );
  
  // TODO: Implement actual push notification / email
  // - PWA Push API
  // - Email via SendGrid/AWS SES
  // - In-app notification
  
  return true;
}

/**
 * Get user notifications
 */
async function getUserNotifications(userId, limit = 50) {
  const result = await query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows;
}

/**
 * Mark notification as read
 */
async function markNotificationRead(notificationId, userId) {
  await query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}

/**
 * Delete/disable alert
 */
async function deleteAlert(alertId, userId) {
  await query(
    `UPDATE user_alerts SET is_active = false WHERE id = $1 AND user_id = $2`,
    [alertId, userId]
  );
}

module.exports = {
  createPriceAlert,
  getUserAlerts,
  checkTriggeredAlerts,
  checkBasketAlerts,
  checkExpiringDeals,
  sendNotification,
  getUserNotifications,
  markNotificationRead,
  deleteAlert
};
