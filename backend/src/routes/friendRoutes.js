const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  sendRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  getFriends,
  removeFriend
} = require('../controllers/friendController');

router.use(authenticateToken);

router.post('/request', sendRequest);
router.get('/requests', getRequests);
router.put('/request/:requestId/accept', acceptRequest);
router.put('/request/:requestId/reject', rejectRequest);
router.delete('/request/:requestId/cancel', cancelRequest);
router.get('/', getFriends);
router.delete('/:friendId', removeFriend);

module.exports = router;
