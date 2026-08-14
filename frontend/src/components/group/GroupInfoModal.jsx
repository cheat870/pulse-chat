import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Users, X, UserPlus, LogOut, Trash2, Shield, Search, Check, AlertCircle } from 'lucide-react';

export default function GroupInfoModal({ conversation, onClose, onGroupUpdated, onLeaveGroup }) {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'add'
  const [members, setMembers] = useState(conversation?.members || []);
  const [friends, setFriends] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [searchMember, setSearchMember] = useState('');
  const [searchFriend, setSearchFriend] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const currentUserRole = members.find(m => m.id === user.id)?.role || conversation?.myRole || 'MEMBER';
  const isAdmin = currentUserRole === 'ADMIN';

  // Load friends to add to group
  useEffect(() => {
    async function loadFriends() {
      try {
        const data = await apiRequest('/friends');
        // Filter out users who are already in the group
        const existingMemberIds = new Set(members.map(m => m.id));
        const available = (data.friends || []).filter(f => !existingMemberIds.has(f.id));
        setFriends(available);
      } catch (err) {
        console.error('Failed to load friends:', err);
      }
    }
    if (activeTab === 'add') {
      loadFriends();
    }
  }, [activeTab, members]);

  // Toggle selection of friend to add
  const toggleFriend = (friendId) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  // Submit Add Members
  const handleAddMembers = async () => {
    if (selectedFriendIds.length === 0) return;
    setLoading(true);
    setActionError(null);

    try {
      await apiRequest(`/chats/group/${conversation.id}/members`, 'POST', {
        userIds: selectedFriendIds
      });

      setSelectedFriendIds([]);
      setActiveTab('members');
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      setActionError(err.message || 'Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  // Remove Member (Admin action)
  const handleRemoveMember = async (memberId, username) => {
    if (!window.confirm(`Are you sure you want to remove ${username} from the group?`)) return;

    setLoading(true);
    setActionError(null);

    try {
      await apiRequest(`/chats/group/${conversation.id}/members/${memberId}`, 'DELETE');
      setMembers(prev => prev.filter(m => m.id !== memberId));
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      setActionError(err.message || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  // Leave Group
  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group chat?')) return;

    setLoading(true);
    setActionError(null);

    try {
      await apiRequest(`/chats/group/${conversation.id}/members/${user.id}`, 'DELETE');
      onClose();
      if (onLeaveGroup) onLeaveGroup(conversation.id);
    } catch (err) {
      setActionError(err.message || 'Failed to leave group');
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.username.toLowerCase().includes(searchMember.toLowerCase()) ||
    (m.email && m.email.toLowerCase().includes(searchMember.toLowerCase()))
  );

  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(searchFriend.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="relative p-6 border-b border-slate-800/80 bg-gradient-to-b from-indigo-950/40 to-slate-900 flex flex-col items-center text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative mb-3">
            <img
              src={conversation.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(conversation.name)}`}
              alt={conversation.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-lg shadow-indigo-950/50"
            />
            {isAdmin && (
              <span className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 text-white rounded-lg shadow-md" title="You are Group Admin">
                <Shield className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <h2 className="text-xl font-extrabold text-white tracking-tight font-display">{conversation.name}</h2>
          <p className="text-xs text-indigo-400 font-medium mt-0.5">
            Group Chat • {members.length} Members
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Members ({members.length})</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('add')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'add'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Members</span>
            </button>
          )}
        </div>

        {/* Action Error Alert */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'members' ? (
            <>
              {/* Member Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search group members..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Members List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredMembers.map((m) => {
                  const isSelf = m.id === user.id;
                  const mIsAdmin = m.role === 'ADMIN';

                  return (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 rounded-2xl flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.username}`}
                            alt={m.username}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700"
                          />
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                            m.is_online ? 'bg-emerald-500' : 'bg-slate-500'
                          }`} />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">
                              {m.username} {isSelf && '(You)'}
                            </span>
                            {mIsAdmin && (
                              <span className="px-1.5 py-0.5 text-[9px] bg-indigo-500/20 text-indigo-400 font-semibold rounded-md border border-indigo-500/30 flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {m.is_online ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>

                      {/* Remove Button for Admin */}
                      {isAdmin && !isSelf && (
                        <button
                          onClick={() => handleRemoveMember(m.id, m.username)}
                          disabled={loading}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                          title="Remove from group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Add Friends Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search friends to add..."
                  value={searchFriend}
                  onChange={(e) => setSearchFriend(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Friends Selector List */}
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {filteredFriends.length === 0 ? (
                  <p className="text-xs text-center text-slate-500 py-6">
                    No available friends to add.
                  </p>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSelected = selectedFriendIds.includes(friend.id);

                    return (
                      <div
                        key={friend.id}
                        onClick={() => toggleFriend(friend.id)}
                        className={`p-3 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500/50'
                            : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`}
                            alt={friend.username}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <span className="text-xs font-bold text-white block">{friend.username}</span>
                            <span className="text-[11px] text-slate-400 block">{friend.email}</span>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Confirm Add Button */}
              {selectedFriendIds.length > 0 && (
                <button
                  onClick={handleAddMembers}
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add {selectedFriendIds.length} Friend(s)</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer Leave Group Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={handleLeaveGroup}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs rounded-xl border border-rose-500/20 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Group Chat</span>
          </button>
        </div>

      </div>
    </div>
  );
}
