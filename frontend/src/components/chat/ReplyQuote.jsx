import React from 'react';
import { X, Reply } from 'lucide-react';
import { getMediaUrl } from '../../services/api';

export default function ReplyQuote({ replyTo, onCancel }) {
  if (!replyTo) return null;

  return (
    <div className="mx-4 mb-2 flex items-start gap-2.5 bg-slate-900/90 border border-indigo-500/30 rounded-2xl px-3.5 py-2 border-l-4 border-l-indigo-500 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-150">
      <Reply className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-indigo-400">Replying to {replyTo.sender_name || 'User'}</p>
        {replyTo.media_url && (
          <div className="w-8 h-8 rounded-lg overflow-hidden my-1 bg-slate-950 border border-slate-800">
            <img src={getMediaUrl(replyTo.media_url)} className="w-full h-full object-cover" />
          </div>
        )}
        <p className="text-xs text-slate-300 truncate">{replyTo.content || '📎 Attachment'}</p>
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
