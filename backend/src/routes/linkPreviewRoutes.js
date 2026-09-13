const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getLinkPreview } = require('../controllers/linkPreviewController');

router.get('/', authenticateToken, getLinkPreview);

module.exports = router;
