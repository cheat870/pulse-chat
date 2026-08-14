import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Send, X } from 'lucide-react';

export default function LocationPickerModal({ onSelectLocation, onClose }) {
  const [lat, setLat] = useState(11.5564); // Default Phnom Penh / center fallback
  const [lng, setLng] = useState(104.9282);
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState('Current GPS Location');

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve location. Using current map coordinates.');
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleSend = () => {
    onSelectLocation({ latitude: lat, longitude: lng });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl glass-panel">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
            <MapPin className="w-5 h-5 text-rose-500" />
            <span>Share Live Location</span>
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coordinate Display */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Coordinates</span>
            <span className="text-sm font-mono text-indigo-400">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
          </div>

          <button
            onClick={getCurrentLocation}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Navigation className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalibrate</span>
          </button>
        </div>

        {/* Embedded OpenStreetMap Preview Frame */}
        <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-800 relative bg-slate-950">
          <iframe
            title="Location Map"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Share Location</span>
          </button>
        </div>
      </div>
    </div>
  );
}
