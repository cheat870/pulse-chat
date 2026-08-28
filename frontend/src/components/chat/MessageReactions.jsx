import React, { useState, useRef, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { SmilePlus } from 'lucide-react';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function MessageReactions({ message, onReactionUpdate }) {
  const [showPicker, setShowPicker] = useState(false);
  const [localReactions, setLocalReactions] = useState(message.reactions || []);
  const [myReaction, setMyReaction] = useState(message.myReaction || null);
  const pickerRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setLocalReactions(message.reactions || []);
    setMyReaction(message.myReaction || null);
  }, [message.reactions, message.myReaction]);

  const react = async (emoji) => {
    setShowPicker(false);
    try {
      const data = await apiRequest(`/reactions/${message.id}`, 'POST', { emoji });
      setLocalReactions(data.reactions || []);
      setMyReaction(data.myReaction);
      if (onReactionUpdate) onReactionUpdate(message.id, data.reactions, data.myReaction);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1 mt-1" ref={pickerRef}>
      {/* Reaction Badge Counts */}
      {localReactions.filter(r => r.count > 0).map(r => (
        <button
          key={r.emoji}
          onClick={() => react(r.emoji)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all hover:scale-105 shadow-sm ${
            myReaction === r.emoji
              ? 'bg-indigo-600/30 border-indigo-500 text-white'
              : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
          title={`React with ${r.emoji}`}
        >
          <span className="text-xs">{r.emoji}</span>
          <span className="text-[10px] font-bold">{r.count}</span>
        </button>
      ))}

      {/* React Plus Button */}
      <button
        onClick={() => setShowPicker(p => !p)}
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-all"
        title="Add Reaction"
      >
        <SmilePlus className="w-3.5 h-3.5" />
      </button>

      {/* Floating Emoji Picker Popover */}
      {showPicker && (
        <div className="absolute bottom-7 left-0 z-50 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => react(emoji)}
              className={`text-base p-1.5 rounded-xl hover:scale-125 transition-transform ${
                myReaction === emoji ? 'bg-indigo-600/30' : 'hover:bg-slate-800'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
