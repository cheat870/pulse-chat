const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// POST /api/polls - create poll
exports.createPoll = (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, question, options } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least 2 options are required' });
    }

    const pollId = uuidv4();
    db.prepare(`
      INSERT INTO polls (id, conversation_id, user_id, question, options)
      VALUES (?, ?, ?, ?, ?)
    `).run(pollId, conversationId, userId, question, JSON.stringify(options));

    const msgId = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content, type)
      VALUES (?, ?, ?, ?, ?)
    `).run(msgId, conversationId, userId, JSON.stringify({ pollId, question, options }), 'POLL');

    const poll = db.prepare('SELECT p.*, u.username, u.avatar_url FROM polls p JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(pollId);
    const pollData = { ...poll, options, votes: [], userVote: null };

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', {
        id: msgId,
        conversation_id: conversationId,
        sender_id: userId,
        content: JSON.stringify({ pollId, question, options }),
        type: 'POLL',
        created_at: new Date().toISOString(),
        poll: pollData
      });
    }

    res.status(201).json({ poll: pollData, messageId: msgId });
  } catch (err) {
    console.error('createPoll error:', err);
    res.status(500).json({ error: 'Failed to create poll' });
  }
};

// POST /api/polls/:pollId/vote
exports.vote = (req, res) => {
  try {
    const userId = req.user.id;
    const { pollId } = req.params;
    const { optionIndex } = req.body;

    const existing = db.prepare('SELECT * FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(pollId, userId);
    if (existing) {
      db.prepare('UPDATE poll_votes SET option_index = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(optionIndex, existing.id);
    } else {
      db.prepare('INSERT INTO poll_votes (id, poll_id, user_id, option_index) VALUES (?, ?, ?, ?)').run(uuidv4(), pollId, userId, optionIndex);
    }

    const votes = db.prepare('SELECT option_index, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option_index').all(pollId);
    const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);

    const io = req.app.get('io');
    if (io && poll) {
      io.to(`conversation:${poll.conversation_id}`).emit('poll_updated', { pollId, votes, userId, optionIndex });
    }

    res.json({ ok: true, votes });
  } catch (err) {
    console.error('vote error:', err);
    res.status(500).json({ error: 'Failed to vote' });
  }
};

// GET /api/polls/:pollId
exports.getPoll = (req, res) => {
  try {
    const userId = req.user.id;
    const { pollId } = req.params;

    const poll = db.prepare('SELECT p.*, u.username, u.avatar_url FROM polls p JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const votes = db.prepare('SELECT option_index, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option_index').all(pollId);
    const userVote = db.prepare('SELECT option_index FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(pollId, userId);

    res.json({
      poll: {
        ...poll,
        options: JSON.parse(poll.options),
        votes,
        userVote: userVote?.option_index ?? null
      }
    });
  } catch (err) {
    console.error('getPoll error:', err);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
};
