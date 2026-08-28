import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMediaUrl, apiRequest } from '../../services/api';
import {
  Heart, MessageCircle, Share2, Trash2, Send,
  MoreHorizontal, CornerDownRight, Check
} from 'lucide-react';

export default function PostCard({ post, onDeletePost }) {
  const { user } = useAuth();
  const isMe = user?.id === post.user_id;

  const [postData, setPostData] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.recentComments || []);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  const reactionEmojis = [
    { emoji: '👍', label: 'Like' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '😂', label: 'Haha' },
    { emoji: '😮', label: 'Wow' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '🔥', label: 'Fire' }
  ];

  const authorAvatar = postData.authorAvatar
    ? getMediaUrl(postData.authorAvatar)
    : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(postData.authorName || 'user')}`;

  const mediaSource = postData.media_url
    ? (postData.media_url.startsWith('http') ? postData.media_url : getMediaUrl(postData.media_url))
    : null;

  // Format time ago
  const formatTimeAgo = (iso) => {
    if (!iso) return '';
    const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Toggle Like / Reaction
  const handleReaction = async (emoji = '❤️') => {
    try {
      const res = await apiRequest(`/posts/${postData.id}/like`, 'POST', { emoji });
      setPostData(prev => ({
        ...prev,
        isLiked: res.action !== 'removed',
        myReaction: res.emoji,
        likes_count: res.totalLikes,
        reactions: res.reactions
      }));
      setShowReactionPicker(false);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  // Fetch full comments
  const handleToggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);

    if (nextState && !commentsLoaded) {
      try {
        const res = await apiRequest(`/posts/${postData.id}/comments`);
        setComments(res.comments || []);
        setCommentsLoaded(true);
      } catch (err) {
        console.error('Load comments error:', err);
      }
    }
  };

  // Submit new comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const res = await apiRequest(`/posts/${postData.id}/comments`, 'POST', { content: newComment.trim() });
      if (res.comment) {
        setComments(prev => [...prev, res.comment]);
        setPostData(prev => ({ ...prev, comments_count: res.totalComments }));
        setNewComment('');
      }
    } catch (err) {
      alert(err.message || 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    try {
      const res = await apiRequest(`/posts/comments/${commentId}`, 'DELETE');
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPostData(prev => ({ ...prev, comments_count: res.totalComments }));
    } catch (err) {
      alert('Could not delete comment');
    }
  };

  // Share link
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl glass-panel">
      
      {/* Post Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={authorAvatar}
            alt={postData.authorName}
            className="w-11 h-11 rounded-full object-cover border border-slate-700 shadow-sm"
          />
          <div>
            <h4 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
              <span>{postData.authorName}</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              {formatTimeAgo(postData.created_at)}
            </span>
          </div>
        </div>

        {/* Post Actions (Delete if author) */}
        {isMe && (
          <button
            type="button"
            onClick={() => onDeletePost?.(postData.id)}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all"
            title="Delete Post"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Post Content Text */}
      {postData.content && (
        <div className="px-4 sm:px-5 pb-3">
          <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
            {postData.content}
          </p>
        </div>
      )}

      {/* Media Display (Photo / Video) */}
      {mediaSource && (
        <div className="bg-black/30 border-y border-slate-800/80 flex items-center justify-center max-h-[500px] overflow-hidden">
          {postData.media_type === 'PHOTO' && (
            <img
              src={mediaSource}
              alt="Post media"
              className="w-full max-h-[500px] object-cover"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400?text=Image+Unavailable'; }}
            />
          )}
          {postData.media_type === 'VIDEO' && (
            <video
              src={mediaSource}
              controls
              playsInline
              className="w-full max-h-[500px] object-contain bg-black"
            />
          )}
        </div>
      )}

      {/* Reactions Summary Bar */}
      {(postData.likes_count > 0 || postData.comments_count > 0) && (
        <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5">
            {postData.reactions && postData.reactions.length > 0 ? (
              <div className="flex items-center -space-x-1">
                {postData.reactions.slice(0, 3).map((r, i) => (
                  <span key={i} className="text-sm bg-slate-800 rounded-full px-1 border border-slate-700 shadow-sm">
                    {r.emoji}
                  </span>
                ))}
              </div>
            ) : (
              <span>❤️</span>
            )}
            <span className="font-semibold text-slate-300 ml-1">{postData.likes_count}</span>
          </div>
          <div>
            <span className="hover:underline cursor-pointer" onClick={handleToggleComments}>
              {postData.comments_count} comment{postData.comments_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Interaction Buttons Bar */}
      <div className="p-2 sm:px-4 flex items-center justify-between gap-1 relative">
        
        {/* Like Reaction Button with Hover Popover */}
        <div
          className="relative flex-1"
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
        >
          {/* Reaction Picker Popover */}
          {showReactionPicker && (
            <div className="absolute bottom-full mb-2 left-0 z-30 flex items-center gap-2 p-2 bg-slate-950 border border-slate-700 rounded-full shadow-2xl backdrop-blur-md animate-fade-in">
              {reactionEmojis.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReaction(emoji)}
                  className="p-1 text-xl hover:scale-135 transition-transform"
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => handleReaction(postData.myReaction || '❤️')}
            className={`w-full py-2 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
              postData.isLiked
                ? 'text-rose-400 bg-rose-950/30 border border-rose-800/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {postData.isLiked ? (
              <>
                <span className="text-base">{postData.myReaction || '❤️'}</span>
                <span>Liked</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4" />
                <span>Like</span>
              </>
            )}
          </button>
        </div>

        {/* Comment Button */}
        <button
          type="button"
          onClick={handleToggleComments}
          className="flex-1 py-2 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Comment</span>
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 py-2 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? 'Copied!' : 'Share'}</span>
        </button>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="p-4 sm:p-5 bg-slate-950/70 border-t border-slate-800/80 space-y-4 animate-fade-in">
          
          {/* New Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2.5">
            <img
              src={user?.avatar_url ? getMediaUrl(user.avatar_url) : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`}
              alt="You"
              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
            />
            <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-1.5 focus-within:border-indigo-500 transition-all">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={commentLoading || !newComment.trim()}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all shadow"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">No comments yet. Be the first to comment!</p>
          ) : (
            <div className="space-y-3 pt-1">
              {comments.map((c) => {
                const commentAvatar = c.authorAvatar
                  ? getMediaUrl(c.authorAvatar)
                  : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(c.authorName || 'user')}`;
                const isMyComment = user?.id === c.user_id;

                return (
                  <div key={c.id} className="flex items-start gap-2.5 group">
                    <img
                      src={commentAvatar}
                      alt={c.authorName}
                      className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0 mt-0.5"
                    />
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2 text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-indigo-300">{c.authorName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">{formatTimeAgo(c.created_at)}</span>
                          {isMyComment && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c.id)}
                              className="hidden group-hover:block text-slate-500 hover:text-rose-400 p-0.5"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
