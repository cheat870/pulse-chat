const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const { searchUsers, updateProfile } = require('../controllers/userController');

router.use(authenticateToken);

router.get('/search', searchUsers);
router.put('/profile', upload.single('avatar'), updateProfile);

module.exports = router;
