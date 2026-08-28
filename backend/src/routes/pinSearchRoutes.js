const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pinMessage, unpinMessage, getPinnedMessages, searchMessages } = require('../controllers/pinSearchController');

router.use(authenticateToken);
router.get('/conversation/:conversationId/pinned', getPinnedMessages);
router.get('/conversation/:conversationId/search', searchMessages);
router.post('/:messageId/pin', pinMessage);
router.delete('/:messageId/pin', unpinMessage);

module.exports = router;
