import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import { MessageSquareDashed } from 'lucide-react';

export default function MessageList({ messages, onReply, onEdit, onDelete, onReaction }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/40">
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
    <div className="flex-1 p-4 overflow-y-auto space-y-2">
      {messages.map(message => (
        <MessageItem
          key={message.id}
          message={message}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onReaction={onReaction}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
