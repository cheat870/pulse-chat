import React, { useState, useEffect } from 'react';
import { Bookmark, ArrowLeft, Trash2, MessageSquare, Image, FileVideo, Sparkles } from 'lucide-react';
import { apiRequest, getMediaUrl } from '../../services/api';

export default function SavedMessagesView({ onBack }) {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/bookmarks');
      setSaved(data.saved || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const unsave = async (messageId) => {
    try {
      await apiRequest(`/bookmarks/${messageId}`, 'DELETE');
      setSaved(prev => prev.filter(s => s.message_id !== messageId));
    } catch (e) {
      alert('Failed to remove bookmark');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Saved Messages</h2>
              <p className="text-[10px] text-slate-400">{saved.length} bookmarked items</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs">Loading bookmarks...</p>
          </div>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
            <div className="w-16 h-16 rounded-3xl bg-amber-950/40 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
              <Bookmark className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No saved messages yet</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Click the bookmark icon on any message to save it to your personal archive.
            </p>
          </div>
        ) : (
          saved.map(s => (
            <div key={s.bookmark_id} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                    {s.sender_avatar ? (
                      <img src={getMediaUrl(s.sender_avatar)} className="w-full h-full object-cover" />
                    ) : (
                      <span>{s.sender_name?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white">{s.sender_name}</span>
                    <span className="text-[10px] text-slate-500 block">in {s.conversation_name || 'Direct Chat'}</span>
                  </div>
                </div>
                <button
                  onClick={() => unsave(s.message_id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Remove from saved"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {s.media_url && (
                <div className="mb-2.5 rounded-xl overflow-hidden max-h-52 bg-slate-950 border border-slate-800">
                  {s.message_type === 'VIDEO' ? (
                    <video src={getMediaUrl(s.media_url)} className="w-full max-h-52 object-cover" controls />
                  ) : (
                    <img src={getMediaUrl(s.media_url)} className="w-full max-h-52 object-cover" />
                  )}
                </div>
              )}

              {s.content && <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{s.content}</p>}
              <p className="text-[10px] text-slate-500 mt-2">{new Date(s.saved_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
