import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMediaUrl, apiRequest } from '../../services/api';
import { Image, Video, Smile, Send, X, Loader } from 'lucide-react';

export default function CreatePostBox({ onPostCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('TEXT');
  const [showEmojiStrip, setShowEmojiStrip] = useState(false);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  const userAvatar = user?.avatar_url
    ? getMediaUrl(user.avatar_url)
    : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`;

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreview(url);

    if (file.type.startsWith('image/')) {
      setMediaType('PHOTO');
    } else if (file.type.startsWith('video/')) {
      setMediaType('VIDEO');
    } else {
      setMediaType(type || 'PHOTO');
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType('TEXT');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      formData.append('mediaType', mediaType);
      if (mediaFile) formData.append('media', mediaFile);

      const res = await apiRequest('/posts', 'POST', formData, true);
      if (res.post) {
        onPostCreated?.(res.post);
      }

      // Reset form
      setContent('');
      removeMedia();
      setShowEmojiStrip(false);
    } catch (err) {
      alert(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const quickEmojis = ['😀', '❤️', '🔥', '😂', '🎉', '👏', '🚀', '💯'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl glass-panel space-y-4">
      {/* Top Input Bar */}
      <div className="flex items-start gap-3">
        <img
          src={userAvatar}
          alt={user?.username}
          className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
        />
        <div className="flex-1">
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${user?.username || 'friend'}?`}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none transition-all"
          />
        </div>
      </div>

      {/* Media Preview Box */}
      {mediaPreview && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black/40 max-h-80 flex items-center justify-center">
          {mediaType === 'PHOTO' && (
            <img src={mediaPreview} alt="Preview" className="max-h-80 w-full object-contain" />
          )}
          {mediaType === 'VIDEO' && (
            <video src={mediaPreview} controls className="max-h-80 w-full rounded-2xl" />
          )}
          <button
            type="button"
            onClick={removeMedia}
            className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-all shadow-lg backdrop-blur-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Quick Picker Strip */}
      {showEmojiStrip && (
        <div className="flex items-center gap-1.5 p-2 bg-slate-950/80 rounded-2xl border border-slate-800">
          {quickEmojis.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => setContent(prev => prev + ' ' + emoji)}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-lg transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => handleFileSelect(e)}
        className="hidden"
      />

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-1">
          {/* Photo Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/40 rounded-xl transition-all"
          >
            <Image className="w-4 h-4" />
            <span>Photo</span>
          </button>

          {/* Video Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-400 hover:bg-purple-950/40 rounded-xl transition-all"
          >
            <Video className="w-4 h-4" />
            <span>Video</span>
          </button>

          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiStrip(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-950/40 rounded-xl transition-all"
          >
            <Smile className="w-4 h-4" />
            <span>Feeling</span>
          </button>
        </div>

        {/* Submit Post Button */}
        <button
          type="button"
          disabled={loading || (!content.trim() && !mediaFile)}
          onClick={handleSubmit}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          {loading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Post</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
