import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, getMediaUrl } from '../../services/api';
import TwoFactorSetup from '../auth/TwoFactorSetup';
import { User, Mail, Phone, Camera, Save, X, Shield } from 'lucide-react';

export default function ProfileModal({ onClose }) {
  const { user, updateUserProfile } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [statusText, setStatusText] = useState(user?.status_text || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatar_url
      ? getMediaUrl(user.avatar_url)
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`
  );
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('statusText', statusText.trim());
      formData.append('phone', phone.trim());
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await apiRequest('/users/profile', 'PUT', formData, true);
      updateUserProfile(res.user);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl glass-panel space-y-4 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
            <User className="w-5 h-5 text-indigo-400" />
            <span>Edit Profile</span>
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Avatar Upload */}
          <div className="flex flex-col items-center justify-center">
            <label className="relative group cursor-pointer">
              <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden group-hover:border-indigo-500 transition-all shadow-md">
                <img
                  src={avatarPreview || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`;
                  }}
                />
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <span className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 text-white rounded-full text-xs shadow-lg group-hover:scale-110 transition-transform">
                <Camera className="w-3.5 h-3.5" />
              </span>
            </label>
            <span className="mt-1.5 text-[11px] text-slate-400 font-medium">Change Photo</span>
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-300">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-300">Email Address (Read only)</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-300">Status Message</label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-300">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Security & 2FA Section */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Two-Factor Authentication</p>
                  <p className="text-[10px] text-slate-400">Protect account with Authenticator app</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShow2FAModal(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold rounded-xl transition-all shadow"
              >
                Configure
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {show2FAModal && (
        <TwoFactorSetup onClose={() => setShow2FAModal(false)} />
      )}
    </div>
  );
}
