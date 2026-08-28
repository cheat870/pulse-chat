const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.get('/', authenticateToken, ctrl.getNotifications);
router.put('/read', authenticateToken, ctrl.markAllRead);
router.delete('/:id', authenticateToken, ctrl.deleteNotification);

module.exports = router;
