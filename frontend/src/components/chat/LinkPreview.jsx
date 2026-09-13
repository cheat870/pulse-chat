import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { ExternalLink, Globe } from 'lucide-react';

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function extractUrls(text) {
  if (!text) return [];
  return [...new Set(text.match(URL_REGEX) || [])];
}

export default function LinkPreview({ url }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    apiRequest(`/link-preview?url=${encodeURIComponent(url)}`)
      .then(data => {
        if (!cancelled && data.ok) setPreview(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2 h-14 w-full rounded-xl bg-slate-800/40 border border-slate-800 animate-pulse flex items-center px-3 gap-2">
        <Globe className="w-4 h-4 text-slate-600" />
        <span className="text-xs text-slate-500">Loading preview...</span>
      </div>
    );
  }

  if (!preview?.title) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2.5 flex flex-col sm:flex-row gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-850 p-2.5 transition-all group overflow-hidden max-w-sm text-left shadow-sm"
    >
      {preview.image && (
        <div className="w-full sm:w-24 h-24 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0">
          <img
            src={preview.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {preview.siteName && (
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider truncate mb-0.5">
            {preview.siteName}
          </p>
        )}
        <p className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">
          {preview.title}
        </p>
        {preview.description && (
          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-normal">
            {preview.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1.5 text-slate-500">
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="text-[10px] truncate max-w-[200px]">
            {url.replace(/^https?:\/\//, '')}
          </span>
        </div>
      </div>
    </a>
  );
}
