import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSound } from '../../context/SoundContext';
import { useSocket } from '../../context/SocketContext';
import { apiRequest } from '../../services/api';
import { MessageSquare, Users, UserPlus, Sun, Moon, Volume2, VolumeX, LogOut, Search, Plus, Circle } from 'lucide-react';

export default function Sidebar({ activeConvId, onSelectConv, onOpenFriends, onOpenGroupModal, onOpenProfile }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isMuted, toggleMute } = useSound();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [unreadRequestsCount, setUnreadRequestsCount] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'PRIVATE', 'GROUP'

  const fetchConversations = async () => {
    try {
      const data = await apiRequest('/chats');
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const fetchUnreadRequests = async () => {
    try {
      const data = await apiRequest('/friends/requests');
      setUnreadRequestsCount(data.incoming ? data.incoming.length : 0);
    } catch (err) {
      console.error('Failed to load request badges:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchUnreadRequests();

    const interval = setInterval(() => {
      fetchConversations();
      fetchUnreadRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Real-time Socket.IO Auto-Refresh Listeners
  useEffect(() => {
    if (!socket) return;

    const handleAutoRefresh = () => {
      fetchConversations();
      fetchUnreadRequests();
    };

    socket.on('new_message', handleAutoRefresh);
    socket.on('user_status_changed', handleAutoRefresh);
    socket.on('incoming_friend_request', handleAutoRefresh);
    socket.on('friend_request_accepted', handleAutoRefresh);

    return () => {
      socket.off('new_message', handleAutoRefresh);
      socket.off('user_status_changed', handleAutoRefresh);
      socket.off('incoming_friend_request', handleAutoRefresh);
      socket.off('friend_request_accepted', handleAutoRefresh);
    };
  }, [socket]);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (filter === 'PRIVATE') return matchesSearch && c.type === 'PRIVATE';
    if (filter === 'GROUP') return matchesSearch && c.type === 'GROUP';
    return matchesSearch;
  });

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden">
      
      {/* Header User Profile Bar */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950">
        <div onClick={onOpenProfile} className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <img
              src={user?.avatar_url}
              alt={user?.username}
              className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover:border-indigo-500 transition-all"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors font-display">
              {user?.username}
            </h2>
            <p className="text-[11px] text-slate-400 truncate max-w-[120px]">
              {user?.status_text || 'Available'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded-xl transition-all"
            title="Toggle Dark/Light Mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleMute}
            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all"
            title={isMuted ? 'Unmute Sounds' : 'Mute Sounds'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-all"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Navigation Actions: Friends & Create Group */}
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-800/60">
        <button
          onClick={onOpenFriends}
          className="relative py-2 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Users className="w-4 h-4 text-indigo-400" />
          <span>Friends</span>
          {unreadRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] bg-rose-500 text-white font-extrabold rounded-full animate-bounce">
              {unreadRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenGroupModal}
          className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
          <span>New Group</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex px-3 pb-2 gap-2 text-xs font-semibold">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1 rounded-lg transition-all ${
            filter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('PRIVATE')}
          className={`px-3 py-1 rounded-lg transition-all ${
            filter === 'PRIVATE' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Direct
        </button>
        <button
          onClick={() => setFilter('GROUP')}
          className={`px-3 py-1 rounded-lg transition-all ${
            filter === 'GROUP' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Groups
        </button>
      </div>

      {/* Conversation Thread List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-500 text-xs">
            No active conversations. Start a chat from Friends!
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isActive = conv.id === activeConvId;
            const peer = conv.peer;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConv(conv.id)}
                className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'hover:bg-slate-900 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={conv.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=conv'}
                      alt={conv.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-700/50"
                    />
                    {conv.type === 'PRIVATE' && peer && (
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                        peer.is_online ? 'bg-emerald-500' : 'bg-slate-500'
                      }`} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-bold truncate font-display ${isActive ? 'text-white' : 'text-slate-100'}`}>
                        {conv.name}
                      </h4>
                      {conv.lastMessage && (
                        <span className={`text-[10px] ml-2 shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                          {new Date(conv.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-xs truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {conv.lastMessage ? (
                          conv.lastMessage.type === 'VOICE' ? '🎤 Voice message' :
                          conv.lastMessage.type === 'PHOTO' ? '📷 Photo' :
                          conv.lastMessage.type === 'VIDEO' ? '🎥 Video' :
                          conv.lastMessage.type === 'LOCATION' ? '📍 Location' :
                          conv.lastMessage.type === 'FILE' ? '📎 Attachment' :
                          conv.lastMessage.content
                        ) : (
                          'No messages yet'
                        )}
                      </p>

                      {conv.unreadCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] font-extrabold bg-rose-500 text-white rounded-full shrink-0 shadow">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
