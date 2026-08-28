import React, { useState, useEffect } from 'react';
import CreatePostBox from './CreatePostBox';
import PostCard from './PostCard';
import { apiRequest } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  Globe, ArrowLeft, RefreshCw, Image, Video,
  Sparkles, Layers, MessageSquareDashed
} from 'lucide-react';

export default function FeedView({ onBack }) {
  const { socket } = useSocket();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'PHOTO' | 'VIDEO'
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/posts');
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Fetch feed error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Real-time Socket.IO synchronization for Social Feed
  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (newPost) => {
      setPosts(prev => [newPost, ...prev.filter(p => p.id !== newPost.id)]);
    };

    const handlePostLiked = ({ postId, totalLikes, reactions }) => {
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, likes_count: totalLikes, reactions };
        }
        return p;
      }));
    };

    const handleNewComment = ({ postId, totalComments, comment }) => {
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const existingComments = p.recentComments || [];
          return {
            ...p,
            comments_count: totalComments,
            recentComments: [...existingComments, comment]
          };
        }
        return p;
      }));
    };

    const handlePostDeleted = ({ postId }) => {
      setPosts(prev => prev.filter(p => p.id !== postId));
    };

    socket.on('new_post', handleNewPost);
    socket.on('post_liked', handlePostLiked);
    socket.on('new_post_comment', handleNewComment);
    socket.on('post_deleted', handlePostDeleted);

    return () => {
      socket.off('new_post', handleNewPost);
      socket.off('post_liked', handlePostLiked);
      socket.off('new_post_comment', handleNewComment);
      socket.off('post_deleted', handlePostDeleted);
    };
  }, [socket]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await apiRequest(`/posts/${postId}`, 'DELETE');
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      alert(err.message || 'Failed to delete post');
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'PHOTO') return post.media_type === 'PHOTO';
    if (filter === 'VIDEO') return post.media_type === 'VIDEO';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-inner">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">News Feed</h2>
              <p className="text-xs text-slate-400">Discover posts, photos & videos from friends</p>
            </div>
          </div>
        </div>

        {/* Refresh Feed Button */}
        <button
          onClick={() => { setRefreshing(true); fetchFeed(); }}
          disabled={refreshing}
          className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Main Feed Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-6 space-y-6 max-w-2xl mx-auto w-full">
        
        {/* Create Post Card */}
        <CreatePostBox onPostCreated={(newPost) => setPosts(prev => [newPost, ...prev])} />

        {/* Filter Badges */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Posts ({posts.length})</span>
          </button>

          <button
            onClick={() => setFilter('PHOTO')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'PHOTO'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>Photos</span>
          </button>

          <button
            onClick={() => setFilter('VIDEO')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'VIDEO'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Videos</span>
          </button>
        </div>

        {/* Posts Stream */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs">Loading feed...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
            <div className="w-16 h-16 rounded-3xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <MessageSquareDashed className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-200 font-display">No posts yet</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Be the first to share a thought, photo, or video with your friends!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onDeletePost={handleDeletePost}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
