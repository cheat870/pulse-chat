const crypto = require('crypto');
const { db } = require('../config/database');

// ── Get Social Feed Posts ─────────────────────────────────────────────────────
function getFeed(req, res) {
  try {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const posts = db.prepare(`
      SELECT p.id, p.user_id, p.content, p.media_type, p.media_url,
             p.likes_count, p.comments_count, p.created_at, p.updated_at,
             u.username AS authorName, u.avatar_url AS authorAvatar, u.status_text AS authorStatus
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    // Format post metadata: isLikedByMe, myReaction, top reactions, recent comments
    const formattedPosts = posts.map(post => {
      // Check current user's reaction
      const userLike = db.prepare('SELECT emoji FROM post_likes WHERE post_id = ? AND user_id = ?').get(post.id, currentUserId);

      // Get reaction summary (counts per emoji)
      const reactions = db.prepare(`
        SELECT emoji, COUNT(*) as count
        FROM post_likes
        WHERE post_id = ?
        GROUP BY emoji
      `).all(post.id);

      // Get total likes count
      const totalLikes = db.prepare('SELECT COUNT(*) as total FROM post_likes WHERE post_id = ?').get(post.id)?.total || 0;

      // Get recent comments (up to 3 for preview)
      const recentComments = db.prepare(`
        SELECT c.id, c.content, c.created_at, c.user_id,
               u.username AS authorName, u.avatar_url AS authorAvatar
        FROM post_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
        LIMIT 5
      `).all(post.id);

      const totalComments = db.prepare('SELECT COUNT(*) as total FROM post_comments WHERE post_id = ?').get(post.id)?.total || 0;

      return {
        ...post,
        likes_count: totalLikes,
        comments_count: totalComments,
        isLiked: !!userLike,
        myReaction: userLike ? userLike.emoji : null,
        reactions,
        recentComments
      };
    });

    return res.json({ posts: formattedPosts, page, hasMore: posts.length === limit });
  } catch (err) {
    console.error('Get Feed Error:', err);
    return res.status(500).json({ error: 'Failed to fetch posts feed' });
  }
}

// ── Create a New Post (Text / Photo / Video) ───────────────────────────────────
function createPost(req, res) {
  try {
    const userId = req.user.id;
    const { content, mediaType, mediaUrl: inputMediaUrl } = req.body;

    let mediaUrl = inputMediaUrl || null;
    let finalMediaType = mediaType || 'TEXT';

    if (req.file) {
      if (req.file.mimetype.startsWith('image/')) {
        finalMediaType = 'PHOTO';
        mediaUrl = `/uploads/photos/${req.file.filename}`;
      } else if (req.file.mimetype.startsWith('video/')) {
        finalMediaType = 'VIDEO';
        mediaUrl = `/uploads/videos/${req.file.filename}`;
      }
    }

    if (!content && !mediaUrl) {
      return res.status(400).json({ error: 'Post must contain text, photo, or video' });
    }

    const postId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO posts (id, user_id, content, media_type, media_url, likes_count, comments_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(postId, userId, content || '', finalMediaType, mediaUrl, now, now);

    const post = db.prepare(`
      SELECT p.id, p.user_id, p.content, p.media_type, p.media_url,
             p.likes_count, p.comments_count, p.created_at, p.updated_at,
             u.username AS authorName, u.avatar_url AS authorAvatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(postId);

    const formattedPost = {
      ...post,
      likes_count: 0,
      comments_count: 0,
      isLiked: false,
      myReaction: null,
      reactions: [],
      recentComments: []
    };

    // Broadcast real-time to all connected sockets
    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', formattedPost);
    }

    return res.status(201).json({ message: 'Post created successfully', post: formattedPost });
  } catch (err) {
    console.error('Create Post Error:', err);
    return res.status(500).json({ error: 'Failed to create post' });
  }
}

// ── Delete a Post ─────────────────────────────────────────────────────────────
function deletePost(req, res) {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== userId) return res.status(403).json({ error: 'Not authorized to delete this post' });

    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);

    const io = req.app.get('io');
    if (io) {
      io.emit('post_deleted', { postId });
    }

    return res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('Delete Post Error:', err);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
}

// ── Toggle Like / Reaction on Post ───────────────────────────────────────────
function togglePostLike(req, res) {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const emoji = req.body.emoji || '❤️';

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = db.prepare('SELECT id, emoji FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, userId);

    let action;
    if (existing) {
      if (existing.emoji === emoji) {
        // Remove reaction
        db.prepare('DELETE FROM post_likes WHERE id = ?').run(existing.id);
        action = 'removed';
      } else {
        // Change reaction emoji
        db.prepare('UPDATE post_likes SET emoji = ? WHERE id = ?').run(emoji, existing.id);
        action = 'updated';
      }
    } else {
      // Add reaction
      db.prepare('INSERT INTO post_likes (id, post_id, user_id, emoji) VALUES (?, ?, ?, ?)')
        .run(crypto.randomUUID(), postId, userId, emoji);
      action = 'added';
    }

    // Recalculate totals
    const totalLikes = db.prepare('SELECT COUNT(*) as total FROM post_likes WHERE post_id = ?').get(postId)?.total || 0;
    const reactions = db.prepare(`
      SELECT emoji, COUNT(*) as count
      FROM post_likes
      WHERE post_id = ?
      GROUP BY emoji
    `).all(postId);

    db.prepare('UPDATE posts SET likes_count = ? WHERE id = ?').run(totalLikes, postId);

    const payload = {
      postId,
      userId,
      action,
      emoji: action === 'removed' ? null : emoji,
      totalLikes,
      reactions
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('post_liked', payload);
    }

    return res.json(payload);
  } catch (err) {
    console.error('Toggle Post Like Error:', err);
    return res.status(500).json({ error: 'Failed to react to post' });
  }
}

// ── Get Comments for a Post ───────────────────────────────────────────────────
function getPostComments(req, res) {
  try {
    const { postId } = req.params;
    const comments = db.prepare(`
      SELECT c.id, c.post_id, c.user_id, c.content, c.created_at,
             u.username AS authorName, u.avatar_url AS authorAvatar
      FROM post_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);

    return res.json({ comments });
  } catch (err) {
    console.error('Get Comments Error:', err);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
}

// ── Add Comment to Post ───────────────────────────────────────────────────────
function addPostComment(req, res) {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO post_comments (id, post_id, user_id, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(commentId, postId, userId, content.trim(), now);

    const totalComments = db.prepare('SELECT COUNT(*) as total FROM post_comments WHERE post_id = ?').get(postId)?.total || 0;
    db.prepare('UPDATE posts SET comments_count = ? WHERE id = ?').run(totalComments, postId);

    const author = db.prepare('SELECT username, avatar_url FROM users WHERE id = ?').get(userId);

    const newComment = {
      id: commentId,
      post_id: postId,
      user_id: userId,
      content: content.trim(),
      created_at: now,
      authorName: author.username,
      authorAvatar: author.avatar_url
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('new_post_comment', { postId, comment: newComment, totalComments });
    }

    return res.status(201).json({ message: 'Comment added', comment: newComment, totalComments });
  } catch (err) {
    console.error('Add Comment Error:', err);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
}

// ── Delete Comment ────────────────────────────────────────────────────────────
function deletePostComment(req, res) {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;

    const comment = db.prepare('SELECT id, post_id, user_id FROM post_comments WHERE id = ?').get(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== userId) return res.status(403).json({ error: 'Not authorized to delete comment' });

    db.prepare('DELETE FROM post_comments WHERE id = ?').run(commentId);

    const totalComments = db.prepare('SELECT COUNT(*) as total FROM post_comments WHERE post_id = ?').get(comment.post_id)?.total || 0;
    db.prepare('UPDATE posts SET comments_count = ? WHERE id = ?').run(totalComments, comment.post_id);

    const io = req.app.get('io');
    if (io) {
      io.emit('post_comment_deleted', { postId: comment.post_id, commentId, totalComments });
    }

    return res.json({ success: true, message: 'Comment deleted', totalComments });
  } catch (err) {
    console.error('Delete Comment Error:', err);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
}

module.exports = {
  getFeed,
  createPost,
  deletePost,
  togglePostLike,
  getPostComments,
  addPostComment,
  deletePostComment
};
