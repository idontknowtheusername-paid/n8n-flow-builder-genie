
const db = require('../config/database');

class NotificationService {
  async createNotification({ userId, type, title, content, link, metadata = {} }) {
    try {
      const result = await db.query(`
        INSERT INTO notifications (user_id, type, title, content, link, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userId, type, title, content, link, JSON.stringify(metadata)]);

      const notification = result.rows[0];

      // Send real-time notification via Socket.IO if available
      const io = global.io;
      if (io) {
        io.to(`user_${userId}`).emit('new_notification', notification);
      }

      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  async createBulkNotifications(notifications) {
    try {
      const values = notifications.map((notif, index) => {
        const baseIndex = index * 6;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
      }).join(', ');

      const params = notifications.flatMap(notif => [
        notif.userId, notif.type, notif.title, notif.content, notif.link, JSON.stringify(notif.metadata || {})
      ]);

      const query = `
        INSERT INTO notifications (user_id, type, title, content, link, metadata)
        VALUES ${values}
        RETURNING *
      `;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Failed to create bulk notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      await db.query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      await db.query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [userId]
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  async deleteOldNotifications(daysOld = 30) {
    try {
      await db.query(
        'DELETE FROM notifications WHERE created_at < NOW() - INTERVAL $1 DAY',
        [daysOld]
      );
    } catch (error) {
      console.error('Failed to delete old notifications:', error);
      throw error;
    }
  }

  // Notification types
  static TYPES = {
    NEW_MESSAGE: 'NEW_MESSAGE',
    NEW_OFFER: 'NEW_OFFER',
    LISTING_APPROVED: 'LISTING_APPROVED',
    LISTING_REJECTED: 'LISTING_REJECTED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    PAYMENT_SENT: 'PAYMENT_SENT',
    NEW_REVIEW: 'NEW_REVIEW',
    LISTING_VIEWED: 'LISTING_VIEWED',
    LISTING_EXPIRED: 'LISTING_EXPIRED',
    KYC_APPROVED: 'KYC_APPROVED',
    KYC_REJECTED: 'KYC_REJECTED',
    SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT'
  };
}

module.exports = NotificationService;
