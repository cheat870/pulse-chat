const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const { register, login, getMe } = require('../controllers/authController');

router.post('/register', upload.single('avatar'), register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);

module.exports = router;
