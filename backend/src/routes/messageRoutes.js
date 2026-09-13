const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  purgeExpiredMessages,
  setDisappearingTimer
} = require('../controllers/messageController');

router.use(authenticateToken);

router.get('/conversation/:conversationId', getMessages);
router.post('/send', upload.single('file'), sendMessage);
router.put('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/reaction', toggleReaction);
router.post('/conversation/:conversationId/disappear', setDisappearingTimer);
router.delete('/purge/expired', purgeExpiredMessages);

module.exports = router;
