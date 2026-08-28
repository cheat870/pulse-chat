const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/pollController');

router.get('/:pollId', authenticateToken, ctrl.getPoll);
router.post('/', authenticateToken, ctrl.createPoll);
router.post('/:pollId/vote', authenticateToken, ctrl.vote);

module.exports = router;
