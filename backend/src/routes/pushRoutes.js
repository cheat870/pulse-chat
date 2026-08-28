const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getVapidPublicKey, subscribe, unsubscribe } = require('../controllers/pushController');

router.get('/vapid-public-key', getVapidPublicKey);
router.use(authenticateToken);
router.post('/subscribe', subscribe);
router.delete('/unsubscribe', unsubscribe);

module.exports = router;
