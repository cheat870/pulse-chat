import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Bot, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';

const QUICK_PROMPTS = [
  '👋 Introduce yourself',
  '🌏 Translate to English: "ជំរាបសួរ"',
  '💡 Tell me a fun fact',
  '😂 Tell me a funny joke',
  '🚀 What can PulseChat do?'
];

export default function AIChatView({ onBack }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.username || 'there'}! 👋 I'm **PulseBot**, your AI assistant inside PulseChat. How can I help you today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const data = await apiRequest('/ai/chat', 'POST', {
        messages: newMessages.map(m => ({ role: m.role, parts: [{ text: m.content }] }))
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Sorry, I ran into an issue: ${err.message}. Please try again!` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>PulseBot AI</span>
                <span className="px-1.5 py-0.2 text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full font-extrabold">AI</span>
              </h2>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" /> Always Ready
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setMessages([{ role: 'assistant', content: `Hi ${user?.username || 'there'}! 👋 Chat cleared. How can I help you today?` }])}
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-colors"
          title="Clear Conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.length === 1 && (
          <div className="py-2">
            <p className="text-[11px] text-slate-500 text-center uppercase tracking-wider font-semibold mb-3">
              Suggested Topics
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="px-3.5 py-2 bg-slate-900/80 border border-slate-800 hover:border-indigo-500 hover:text-indigo-300 text-slate-300 text-xs rounded-2xl transition-all shadow-sm"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2.5`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 text-white shadow-md">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-md px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-sm shadow-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-2.5 focus-within:border-indigo-500 transition-all shadow-inner">
          <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask PulseBot anything..."
            className="flex-1 bg-transparent text-white text-xs sm:text-sm placeholder-slate-500 outline-none"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
