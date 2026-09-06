import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import { MessageSquareDashed } from 'lucide-react';

export default function MessageList({ messages, onReply, onEdit, onDelete, onReaction, onPin }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    // Auto scroll down if new message arrived or first load
    if (messages.length > prevMsgCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: prevMsgCountRef.current === 0 ? 'auto' : 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 h-full">
        <div className="w-16 h-16 rounded-3xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
          <MessageSquareDashed className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-200 font-display">No messages yet</h3>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          Say hello, record a voice note, or share a location to start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full overflow-y-auto p-4 space-y-2 overscroll-contain scrollbar-thin scrollbar-thumb-slate-700"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {messages.map(message => (
        <div key={message.id} id={`msg-${message.id}`} className="transition-all duration-300 rounded-2xl">
          <MessageItem
            message={message}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onReaction={onReaction}
            onPin={onPin}
          />
        </div>
      ))}
      <div ref={bottomRef} className="h-2" />
    </div>
  );
}
