import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Globe, Sparkles } from 'lucide-react';
import { apiRequest, getMediaUrl } from '../../services/api';

export default function GlobalSearch({ onClose, onSelectUser }) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('people');
  const [results, setResults] = useState({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ users: [], posts: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [usersRes, postsRes] = await Promise.all([
          apiRequest(`/users/search?q=${encodeURIComponent(query)}`),
          apiRequest(`/posts`)
        ]);
        const matchingPosts = (postsRes.posts || []).filter(p =>
          p.content?.toLowerCase().includes(query.toLowerCase()) ||
          p.username?.toLowerCase().includes(query.toLowerCase())
        );
        setResults({ users: usersRes.users || [], posts: matchingPosts });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search users, posts, or messages..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm font-medium"
          />
          {loading && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setTab('people')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'people' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-950/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>People ({results.users.length})</span>
          </button>
          <button
            onClick={() => setTab('posts')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'posts' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-950/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Posts ({results.posts.length})</span>
          </button>
        </div>

        {/* Results Stream */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
          {query.trim().length < 2 ? (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <Sparkles className="w-6 h-6 text-slate-600" />
              <span>Type at least 2 characters to search across PulseChat</span>
            </div>
          ) : tab === 'people' ? (
            results.users.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No users found for "{query}"</div>
            ) : (
              results.users.map(u => (
                <div
                  key={u.id}
                  onClick={() => {
                    onSelectUser && onSelectUser(u.id);
                    onClose();
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {u.avatar_url ? (
                      <img src={getMediaUrl(u.avatar_url)} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-white text-sm">{u.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                    <p className="text-xs text-slate-400 truncate">{u.bio || u.status_text || 'PulseChat member'}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${u.is_online ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                </div>
              ))
            )
          ) : (
            results.posts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No posts found matching "{query}"</div>
            ) : (
              results.posts.map(p => (
                <div key={p.id} className="p-4 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center overflow-hidden">
                      {p.avatar_url ? (
                        <img src={getMediaUrl(p.avatar_url)} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-white">{p.username?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white">{p.username}</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">{p.content}</p>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
