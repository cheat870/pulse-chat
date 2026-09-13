const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const userCtrl = require('../controllers/userController');

router.use(authenticateToken);

router.put('/e2ee-key', userCtrl.saveE2EEPublicKey);
router.get('/:userId/e2ee-key', userCtrl.getE2EEPublicKey);
router.get('/search', userCtrl.searchUsers);
router.get('/analytics', userCtrl.getAnalytics);
router.get('/:userId/profile', userCtrl.getProfile);
router.put('/profile', upload.single('avatar'), userCtrl.updateProfile);
router.post('/avatar', upload.single('avatar'), userCtrl.updateProfile);
router.put('/online-status', userCtrl.toggleOnlineVisibility);

module.exports = router;
