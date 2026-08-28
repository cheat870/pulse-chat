const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const storyCtrl = require('../controllers/storyController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `story_${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/', authenticateToken, storyCtrl.getStories);
router.post('/', authenticateToken, upload.single('media'), storyCtrl.createStory);
router.post('/:id/view', authenticateToken, storyCtrl.viewStory);
router.delete('/:id', authenticateToken, storyCtrl.deleteStory);
router.get('/:id/views', authenticateToken, storyCtrl.getStoryViewers);

module.exports = router;
