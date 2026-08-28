import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader } from 'lucide-react';

// Uses Giphy public beta API (no key needed for limited requests)
// Or uses tenor as fallback
const GIPHY_API_KEY = 'dc6zaTOxFJmzC'; // Giphy public beta key
const GIPHY_TRENDING = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
const GIPHY_SEARCH = (q) => `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`;

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const fetchGifs = async (url) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      const data = await res.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('GIF fetch error:', err);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifs(GIPHY_TRENDING);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSearch = (q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      fetchGifs(GIPHY_TRENDING);
      return;
    }
    debounceRef.current = setTimeout(() => fetchGifs(GIPHY_SEARCH(q)), 400);
  };

  const handleSelect = (gif) => {
    onSelect?.({
      url: gif.images?.fixed_height?.url || gif.images?.original?.url,
      width: gif.images?.fixed_height?.width,
      height: gif.images?.fixed_height?.height,
      title: gif.title,
      id: gif.id
    });
  };

  return (
    <div className="absolute bottom-full mb-2 left-0 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <span className="text-lg">🎭</span>
        <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search GIFs..."
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* GIF Grid */}
      <div className="h-64 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <span className="text-3xl mb-2">😔</span>
            <p className="text-xs">No GIFs found</p>
          </div>
        ) : (
          <div className="columns-3 gap-1.5 space-y-1.5">
            {gifs.map((gif) => {
              const preview = gif.images?.fixed_height_small?.url || gif.images?.preview_gif?.url;
              if (!preview) return null;
              return (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleSelect(gif)}
                  className="w-full rounded-xl overflow-hidden hover:opacity-80 hover:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 break-inside-avoid"
                >
                  <img
                    src={preview}
                    alt={gif.title}
                    className="w-full object-cover rounded-xl"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Giphy Attribution */}
      <div className="flex justify-end px-3 py-1 border-t border-slate-800">
        <img
          src="https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif"
          alt="Powered by GIPHY"
          className="h-4 opacity-60"
        />
      </div>
    </div>
  );
}
