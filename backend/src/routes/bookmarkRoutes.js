const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/bookmarkController');

router.get('/', authenticateToken, ctrl.getSaved);
router.post('/', authenticateToken, ctrl.saveMessage);
router.delete('/:messageId', authenticateToken, ctrl.unsaveMessage);

module.exports = router;
