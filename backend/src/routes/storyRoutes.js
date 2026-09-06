const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const storyCtrl = require('../controllers/storyController');

router.get('/', authenticateToken, storyCtrl.getStories);
router.post('/', authenticateToken, upload.single('media'), storyCtrl.createStory);
router.post('/:id/view', authenticateToken, storyCtrl.viewStory);
router.delete('/:id', authenticateToken, storyCtrl.deleteStory);
router.get('/:id/views', authenticateToken, storyCtrl.getStoryViewers);

module.exports = router;
