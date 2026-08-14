import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { Users, X, Camera, Check } from 'lucide-react';

export default function CreateGroupModal({ onClose, onGroupCreated }) {
  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFriends() {
      try {
        const data = await apiRequest('/friends');
        setFriends(data.friends || []);
      } catch (err) {
        console.error('Failed to load friends for group:', err);
      }
    }
    loadFriends();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const toggleMember = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter a group name');
    if (selectedMemberIds.length === 0) return alert('Please select at least 1 friend to create a group');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      selectedMemberIds.forEach(id => formData.append('memberIds', id));
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await apiRequest('/chats/group', 'POST', formData, true);
      onGroupCreated(res.conversationId);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl glass-panel space-y-4">
        
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Create New Group</span>
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Avatar Selector */}
          <div className="flex flex-col items-center justify-center">
            <label className="relative group cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden group-hover:border-indigo-500 transition-all">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Group Icon" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-500 group-hover:text-indigo-400" />
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
            <span className="mt-1 text-[11px] text-slate-400">Set Group Photo</span>
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-300">Group Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Design Team, Football Squad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-300">Select Members *</label>
            <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
              {friends.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No friends available to add</p>
              ) : (
                friends.map(friend => {
                  const isSelected = selectedMemberIds.includes(friend.id);
                  return (
                    <div
                      key={friend.id}
                      onClick={() => toggleMember(friend.id)}
                      className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isSelected ? 'bg-indigo-950/60 border border-indigo-500/40' : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={friend.avatar_url} alt={friend.username} className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-xs font-semibold text-white">{friend.username}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
