const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const {
  getFeed,
  createPost,
  deletePost,
  togglePostLike,
  getPostComments,
  addPostComment,
  deletePostComment
} = require('../controllers/postController');

router.use(authenticateToken);

router.get('/', getFeed);
router.post('/', upload.single('media'), createPost);
router.delete('/:postId', deletePost);
router.post('/:postId/like', togglePostLike);
router.get('/:postId/comments', getPostComments);
router.post('/:postId/comments', addPostComment);
router.delete('/comments/:commentId', deletePostComment);

module.exports = router;
