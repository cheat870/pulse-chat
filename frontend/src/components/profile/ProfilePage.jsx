import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Edit3, Check, X, Camera, MessageSquare, Image, Sparkles } from 'lucide-react';
import { apiRequest, getMediaUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://pulse-chat-o97b.onrender.com';

export default function ProfilePage({ userId, onBack, onStartChat }) {
  const { user: currentUser, updateUserProfile } = useAuth();
  const targetId = userId || currentUser?.id;
  const isOwn = !userId || targetId === currentUser?.id;
  const [profile, setProfile] = useState(() => {
    if (isOwn && currentUser) return currentUser;
    return null;
  });
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const fetchProfile = async () => {
    try {
      if (!profile) setLoading(true);
      const data = await apiRequest(`/users/${targetId}/profile`);
      if (data && data.user) {
        setProfile(data.user);
        setPosts(data.posts || []);
      }
    } catch (e) {
      console.error('Fetch profile error:', e);
      if (isOwn && currentUser) {
        setProfile(p => p || currentUser);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetId) fetchProfile();
  }, [targetId]);

  const activeProfile = profile || (isOwn ? currentUser : null);

  const startEdit = () => {
    setEditData({
      username: activeProfile?.username || '',
      bio: activeProfile?.bio || '',
      status_text: activeProfile?.status_text || ''
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const data = await apiRequest('/users/profile', 'PUT', editData);
      if (data && data.user) {
        setProfile(p => ({ ...p, ...data.user }));
        if (updateUserProfile) updateUserProfile(data.user);
      }
      setEditing(false);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('avatar', file);
    try {
      const data = await apiRequest('/users/profile', 'PUT', form, true);
      if (data && data.user) {
        setProfile(p => ({ ...p, ...data.user }));
        if (updateUserProfile) updateUserProfile(data.user);
      }
    } catch (err) {
      alert(err.message || 'Failed to upload avatar');
    }
  };

  if (loading && !activeProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-950">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-slate-400">Loading profile...</p>
      </div>
    );
  }

  if (!activeProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-950 p-6 text-center">
        <p className="text-sm text-slate-300 font-semibold mb-2">User Profile Not Found</p>
        <p className="text-xs text-slate-500 mb-4">The profile could not be loaded or user is unavailable.</p>
        <button onClick={onBack} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-white text-sm">{activeProfile.username}</h2>
            <p className="text-[10px] text-slate-400">Profile</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwn && !editing && (
            <button
              onClick={startEdit}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit Profile</span>
            </button>
          )}

          {editing && (
            <>
              <button onClick={() => setEditing(false)} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-xl">
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </>
          )}

          {!isOwn && (
            <button
              onClick={() => onStartChat && onStartChat(activeProfile.id)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 max-w-xl mx-auto w-full space-y-6">
        {/* Avatar and Stats */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-22 h-22 rounded-full bg-slate-800 border-4 border-slate-900 overflow-hidden shadow-xl ring-2 ring-indigo-500/30">
              {activeProfile.avatar_url ? (
                <img
                  src={getMediaUrl(activeProfile.avatar_url)}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activeProfile.username || 'user')}`;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold text-white bg-indigo-700">
                  {activeProfile.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {isOwn && (
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md text-white transition-all"
                title="Change Avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </div>

          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{posts.length}</p>
              <p className="text-xs text-slate-400">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{activeProfile.friends_count || 0}</p>
              <p className="text-xs text-slate-400">Friends</p>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="space-y-3">
          {editing ? (
            <div className="space-y-2.5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Username</label>
                <input
                  value={editData.username}
                  onChange={e => setEditData(p => ({ ...p, username: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Bio</label>
                <textarea
                  value={editData.bio}
                  onChange={e => setEditData(p => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  placeholder="Tell friends about yourself..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 mt-1 resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Status Message</label>
                <input
                  value={editData.status_text}
                  onChange={e => setEditData(p => ({ ...p, status_text: e.target.value }))}
                  placeholder="e.g. Busy coding, At work..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 mt-1"
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="font-bold text-white text-base">{activeProfile.username}</p>
              {activeProfile.status_text && (
                <p className="text-xs text-indigo-400 font-medium mt-0.5">{activeProfile.status_text}</p>
              )}
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {activeProfile.bio || 'No bio yet.'}
              </p>
            </div>
          )}

          {/* Online status indicator */}
          <div className="flex items-center gap-2 text-xs pt-1">
            <div className={`w-2 h-2 rounded-full ${activeProfile.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-slate-400 text-[11px]">
              {activeProfile.is_online
                ? 'Active Now'
                : activeProfile.last_seen
                ? `Last seen ${new Date(activeProfile.last_seen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : 'Offline'}
            </span>
          </div>
        </div>

        {/* Posts Grid */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5 text-indigo-400" />
            <span>Posts ({posts.length})</span>
          </h3>

          {posts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800/60 flex flex-col items-center gap-2">
              <Sparkles className="w-6 h-6 text-slate-600" />
              <span>No posts shared yet</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {posts.map(post => (
                <div key={post.id} className="aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-800/80">
                  {post.media_type === 'VIDEO' ? (
                    <video src={getMediaUrl(post.media_url)} className="w-full h-full object-cover" />
                  ) : post.media_url ? (
                    <img src={getMediaUrl(post.media_url)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-3 text-center bg-slate-900">
                      <p className="text-[10px] text-slate-400 line-clamp-3">{post.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
