import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { apiRequest, getMediaUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function StoryViewer({ group, initialIndex = 0, onClose, onNextGroup }) {
  const { user } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const story = group.stories[currentIdx];
  const isOwn = group.user.id === user?.id;

  useEffect(() => {
    if (story && !story.has_viewed) {
      apiRequest(`/stories/${story.id}/view`, 'POST').catch(() => {});
    }
  }, [story?.id]);

  useEffect(() => {
    setProgress(0);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 2; // 50 ticks * 100ms = 5 seconds
      });
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [currentIdx, group.user.id]);

  const goNext = () => {
    if (currentIdx < group.stories.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      onNextGroup(1);
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
    } else {
      onNextGroup(-1);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this story?')) return;
    try {
      await apiRequest(`/stories/${story.id}`, 'DELETE');
      if (group.stories.length <= 1) {
        onClose();
      } else {
        goNext();
      }
    } catch (e) {
      alert(e.message || 'Failed to delete');
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-sm h-full max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{
                  width: i < currentIdx ? '100%' : i === currentIdx ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-700 border border-white/20">
              {group.user.avatar_url ? (
                <img src={getMediaUrl(group.user.avatar_url)} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs">
                  {group.user.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-bold text-xs">{group.user.username}</p>
              <p className="text-white/60 text-[10px]">{new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwn && (
              <>
                <span className="flex items-center gap-1 text-white/80 text-[11px] bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  <Eye className="w-3 h-3" /> {story.view_count || 0}
                </span>
                <button onClick={handleDelete} className="p-1.5 text-white/70 hover:text-rose-400 rounded-full hover:bg-black/30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-black/30">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="flex-1 relative flex items-center justify-center bg-black">
          {story.media_type === 'VIDEO' ? (
            <video src={getMediaUrl(story.media_url)} className="w-full h-full object-cover" autoPlay muted loop />
          ) : (
            <img src={getMediaUrl(story.media_url)} className="w-full h-full object-cover" />
          )}

          {/* Left/Right Tap zones */}
          <button onClick={goPrev} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" />
          <button onClick={goNext} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" />
        </div>

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-4 left-0 right-0 px-4 z-20">
            <p className="text-white text-xs bg-black/60 rounded-2xl px-3.5 py-2.5 backdrop-blur-md text-center">
              {story.caption}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
