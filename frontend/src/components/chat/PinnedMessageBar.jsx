import React, { useState } from 'react';
import { Pin, X, ChevronRight } from 'lucide-react';

export default function PinnedMessageBar({ pinnedMessages, onUnpin, onJumpTo }) {
  const [expanded, setExpanded] = useState(false);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const latest = pinnedMessages[0];
  const preview = latest.content
    ? latest.content.slice(0, 60) + (latest.content.length > 60 ? '...' : '')
    : `📎 ${latest.type?.toLowerCase() || 'media'}`;

  return (
    <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      {/* Collapsed bar */}
      <div
        className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-slate-800/60 transition-all"
        onClick={() => {
          if (pinnedMessages.length === 1) {
            onJumpTo?.(latest.message_id);
          } else {
            setExpanded(e => !e);
          }
        }}
      >
        <div className="flex-shrink-0 flex items-center gap-1.5 text-indigo-400">
          <Pin className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold text-indigo-400">
            {pinnedMessages.length > 1 ? `Pinned (${pinnedMessages.length})` : 'Pinned'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-slate-300 truncate block">{preview}</span>
        </div>
        {pinnedMessages.length > 1 && (
          <ChevronRight
            className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        )}
        {pinnedMessages.length === 1 && onUnpin && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUnpin(latest.message_id); }}
            className="flex-shrink-0 p-1 text-slate-500 hover:text-rose-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Expanded list (multiple pins) */}
      {expanded && pinnedMessages.length > 1 && (
        <div className="border-t border-slate-800 divide-y divide-slate-800 max-h-48 overflow-y-auto">
          {pinnedMessages.map((msg) => {
            const text = msg.content
              ? msg.content.slice(0, 80)
              : `📎 ${msg.type?.toLowerCase() || 'media'}`;
            return (
              <div
                key={msg.message_id}
                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-800/60 cursor-pointer transition-all"
                onClick={() => { onJumpTo?.(msg.message_id); setExpanded(false); }}
              >
                <Pin className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-indigo-300">{msg.senderName}</span>
                  <span className="text-xs text-slate-300 truncate block">{text}</span>
                </div>
                {onUnpin && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUnpin(msg.message_id); }}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
