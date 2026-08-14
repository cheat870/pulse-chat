const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const { register, login, googleLogin, getMe } = require('../controllers/authController');

router.post('/register', upload.single('avatar'), register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authenticateToken, getMe);

module.exports = router;
