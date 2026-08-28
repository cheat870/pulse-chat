const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/reactionController');

router.post('/:messageId', authenticateToken, ctrl.toggleReaction);
router.get('/:messageId', authenticateToken, ctrl.getReactions);

module.exports = router;
