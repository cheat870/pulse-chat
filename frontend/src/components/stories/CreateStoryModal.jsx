import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://pulse-chat-o97b.onrender.com';

export default function CreateStoryModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('PHOTO');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaType(file.type.startsWith('video') ? 'VIDEO' : 'PHOTO');
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!mediaFile) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('pulsechat_token');
      const form = new FormData();
      form.append('media', mediaFile);
      form.append('caption', caption);
      form.append('media_type', mediaType);

      const res = await fetch(`${BACKEND_URL}/api/stories`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onCreated(data.story);
    } catch (err) {
      alert(err.message || 'Failed to publish story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Create New Story</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-full aspect-[9/14] bg-slate-950 rounded-2xl overflow-hidden cursor-pointer flex items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500 transition-all group"
          >
            {mediaPreview ? (
              mediaType === 'VIDEO' ? (
                <video src={mediaPreview} className="w-full h-full object-cover" autoPlay muted loop />
              ) : (
                <img src={mediaPreview} className="w-full h-full object-cover" />
              )
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-300 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium">Select photo or video</span>
                <span className="text-[10px] text-slate-500">Visible to friends for 24 hours</span>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />

          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
          />

          <button
            onClick={handleSubmit}
            disabled={!mediaFile || loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-xs shadow-lg shadow-indigo-600/20"
          >
            {loading ? 'Sharing Story...' : 'Share to Story (24 Hours)'}
          </button>
        </div>
      </div>
    </div>
  );
}
