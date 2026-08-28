const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const aiCtrl = require('../controllers/aiController');

router.post('/chat', authenticateToken, aiCtrl.chat);

module.exports = router;
