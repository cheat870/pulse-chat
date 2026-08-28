const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/themeController');

router.get('/:conversationId', authenticateToken, ctrl.getTheme);
router.put('/:conversationId', authenticateToken, ctrl.setTheme);

module.exports = router;
