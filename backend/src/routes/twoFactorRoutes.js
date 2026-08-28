const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { setup2FA, verify2FA, disable2FA, get2FAStatus } = require('../controllers/twoFactorController');

router.use(authenticateToken);
router.get('/status', get2FAStatus);
router.post('/setup', setup2FA);
router.post('/verify', verify2FA);
router.post('/disable', disable2FA);

module.exports = router;
