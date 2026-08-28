import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare } from 'lucide-react';
import { apiRequest } from '../../services/api';

export default function SearchMessagesPanel({ conversationId, onJumpTo, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = (q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiRequest(`/pin/conversation/${conversationId}/search?q=${encodeURIComponent(q.trim())}`);
        setResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const highlightMatch = (text, q) => {
    if (!text || !q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-indigo-400/30 text-indigo-200 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="absolute top-0 right-0 w-full sm:w-80 h-full bg-slate-900 border-l border-slate-800 z-30 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <Search className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          onClick={onClose}
          className="p-1 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">No messages found for</p>
            <p className="text-sm font-semibold text-slate-400">"{query}"</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="divide-y divide-slate-800">
            <p className="px-4 py-2 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((msg) => (
              <button
                key={msg.id}
                type="button"
                onClick={() => { onJumpTo?.(msg.id); onClose?.(); }}
                className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={msg.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.senderName)}`}
                    alt={msg.senderName}
                    className="w-5 h-5 rounded-full flex-shrink-0"
                  />
                  <span className="text-xs font-semibold text-indigo-300">{msg.senderName}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">{formatDate(msg.created_at)}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {highlightMatch(msg.content, query)}
                </p>
              </button>
            ))}
          </div>
        )}

        {!query && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Search className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">Type at least 2 characters to search</p>
          </div>
        )}
      </div>
    </div>
  );
}
