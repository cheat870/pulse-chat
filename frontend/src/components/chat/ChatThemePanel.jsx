import React, { useState, useEffect } from 'react';
import { X, Palette, Check } from 'lucide-react';
import { apiRequest } from '../../services/api';

const THEME_COLORS = [
  { name: 'indigo', label: 'Indigo', bg: 'bg-indigo-600' },
  { name: 'emerald', label: 'Emerald', bg: 'bg-emerald-600' },
  { name: 'rose', label: 'Rose', bg: 'bg-rose-600' },
  { name: 'purple', label: 'Purple', bg: 'bg-purple-600' },
  { name: 'amber', label: 'Amber', bg: 'bg-amber-600' },
  { name: 'cyan', label: 'Cyan', bg: 'bg-cyan-600' }
];

const WALLPAPERS = [
  { name: 'none', label: 'Default Dark', preview: 'bg-slate-950' },
  { name: 'aurora', label: 'Aurora Glow', preview: 'bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950' },
  { name: 'emerald', label: 'Emerald Forest', preview: 'bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900' },
  { name: 'sunset', label: 'Sunset Twilight', preview: 'bg-gradient-to-br from-rose-950 via-slate-950 to-amber-950' },
  { name: 'deepspace', label: 'Deep Space', preview: 'bg-slate-950 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]' }
];

export default function ChatThemePanel({ conversationId, isOpen, onClose, onThemeChange }) {
  const [selectedColor, setSelectedColor] = useState('indigo');
  const [selectedWallpaper, setSelectedWallpaper] = useState('none');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (conversationId && isOpen) {
      apiRequest(`/themes/${conversationId}`)
        .then(d => {
          if (d.theme) {
            setSelectedColor(d.theme.theme_color || 'indigo');
            setSelectedWallpaper(d.theme.wallpaper || 'none');
          }
        })
        .catch(console.error);
    }
  }, [conversationId, isOpen]);

  const applyTheme = async () => {
    try {
      setSaving(true);
      await apiRequest(`/themes/${conversationId}`, 'PUT', {
        theme_color: selectedColor,
        wallpaper: selectedWallpaper
      });
      if (onThemeChange) {
        onThemeChange({ theme_color: selectedColor, wallpaper: selectedWallpaper });
      }
      onClose();
    } catch (e) {
      alert(e.message || 'Failed to save theme settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-4 top-16 z-50 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Customize Chat Theme</h3>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-2">Bubble Accent Color</label>
          <div className="grid grid-cols-6 gap-2">
            {THEME_COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => setSelectedColor(c.name)}
                className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center transition-transform hover:scale-110 shadow-sm ${
                  selectedColor === c.name ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                }`}
                title={c.label}
              >
                {selectedColor === c.name && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-2">Chat Wallpaper</label>
          <div className="space-y-1.5">
            {WALLPAPERS.map(w => (
              <button
                key={w.name}
                onClick={() => setSelectedWallpaper(w.name)}
                className={`w-full p-2 rounded-xl flex items-center justify-between border transition-all text-left ${w.preview} ${
                  selectedWallpaper === w.name
                    ? 'border-indigo-500 ring-1 ring-indigo-500/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-semibold text-white">{w.label}</span>
                {selectedWallpaper === w.name && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={applyTheme}
          disabled={saving}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-md"
        >
          {saving ? 'Applying...' : 'Apply Theme'}
        </button>
      </div>
    </div>
  );
}
