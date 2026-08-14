const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const {
  getConversations,
  getOrCreatePrivateChat,
  createGroupChat,
  updateGroupInfo,
  addGroupMember,
  removeGroupMember
} = require('../controllers/chatController');

router.use(authenticateToken);

router.get('/', getConversations);
router.post('/private', getOrCreatePrivateChat);
router.post('/group', upload.single('avatar'), createGroupChat);
router.put('/group/:conversationId', upload.single('avatar'), updateGroupInfo);
router.post('/group/:conversationId/members', addGroupMember);
router.delete('/group/:conversationId/members/:memberId', removeGroupMember);

module.exports = router;
