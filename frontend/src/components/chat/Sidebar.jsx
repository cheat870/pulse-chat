import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSound } from '../../context/SoundContext';
import { useSocket } from '../../context/SocketContext';
import { apiRequest, getMediaUrl } from '../../services/api';
import NotificationCenter from '../notifications/NotificationCenter';
import {
  MessageSquare, Users, UserPlus, Sun, Moon, Volume2, VolumeX, LogOut,
  Search, Plus, Circle, Globe, Bell, Bookmark, Bot, BarChart3, Sparkles
} from 'lucide-react';

export default function Sidebar({
  activeConvId,
  onSelectConv,
  onOpenFriends,
  onOpenFeed,
  onOpenSaved,
  onOpenAI,
  onOpenAnalytics,
  onOpenSearch,
  onOpenGroupModal,
  onOpenProfile,
  currentView
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isMuted, toggleMute } = useSound();
  const { socket } = useSocket();

  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [conversations, setConversations] = useState(() => {
    try {
      const cached = localStorage.getItem('pulsechat_conversations_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [unreadRequestsCount, setUnreadRequestsCount] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'PRIVATE', 'GROUP'

  const fetchConversations = async () => {
    try {
      const data = await apiRequest('/chats');
      if (data && data.conversations) {
        setConversations(data.conversations);
        localStorage.setItem('pulsechat_conversations_cache', JSON.stringify(data.conversations));
      }
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

  // Real-time Socket.IO & Custom Event Auto-Refresh Listeners
  useEffect(() => {
    const handleAutoRefresh = () => {
      fetchConversations();
      fetchUnreadRequests();
    };

    window.addEventListener('pulse_message_sent', handleAutoRefresh);

    if (socket) {
      socket.on('new_message', handleAutoRefresh);
      socket.on('user_status_changed', handleAutoRefresh);
      socket.on('incoming_friend_request', handleAutoRefresh);
      socket.on('friend_request_accepted', handleAutoRefresh);
    }

    return () => {
      window.removeEventListener('pulse_message_sent', handleAutoRefresh);
      if (socket) {
        socket.off('new_message', handleAutoRefresh);
        socket.off('user_status_changed', handleAutoRefresh);
        socket.off('incoming_friend_request', handleAutoRefresh);
        socket.off('friend_request_accepted', handleAutoRefresh);
      }
    };
  }, [socket]);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (filter === 'PRIVATE') return matchesSearch && c.type === 'PRIVATE';
    if (filter === 'GROUP') return matchesSearch && c.type === 'GROUP';
    return matchesSearch;
  });

  const userAvatarSrc = user?.avatar_url
    ? getMediaUrl(user.avatar_url)
    : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`;

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden">
      
      {/* Header User Profile Bar */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950">
        <div onClick={onOpenProfile} className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <img
              src={userAvatarSrc}
              alt={user?.username}
              className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover:border-indigo-500 transition-all"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`;
              }}
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
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => setShowNotifs(p => !p)}
            className="relative p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            )}
          </button>

          {/* Notification Center Popover */}
          <NotificationCenter isOpen={showNotifs} onClose={() => setShowNotifs(false)} />

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

      {/* Main Navigation Actions: Feed, Friends & Create Group */}
      <div className="p-2.5 grid grid-cols-3 gap-1.5 border-b border-slate-800/60">
        <button
          onClick={onOpenFeed}
          className={`py-2 px-2 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            currentView === 'feed'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
          }`}
          title="Social News Feed"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>Feed</span>
        </button>

        <button
          onClick={onOpenFriends}
          className={`relative py-2 px-2 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            currentView === 'friends'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border-indigo-500/20'
          }`}
          title="Friends List & Requests"
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Friends</span>
          {unreadRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] bg-rose-500 text-white font-extrabold rounded-full animate-bounce">
              {unreadRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenGroupModal}
          className="py-2 px-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          title="Create New Group"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-400" />
          <span>Group</span>
        </button>
      </div>

      {/* Secondary Quick Action Strip */}
      <div className="px-2.5 py-2 grid grid-cols-4 gap-1 border-b border-slate-800/40 bg-slate-950/40">
        <button
          onClick={onOpenAI}
          className={`py-1.5 px-1 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
            currentView === 'ai'
              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-900'
          }`}
          title="PulseBot AI Assistant"
        >
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Bot</span>
        </button>

        <button
          onClick={onOpenSaved}
          className={`py-1.5 px-1 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
            currentView === 'saved'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-amber-400 hover:bg-slate-900'
          }`}
          title="Saved / Bookmarked Messages"
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          <span>Saved</span>
        </button>

        <button
          onClick={onOpenAnalytics}
          className={`py-1.5 px-1 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
            currentView === 'analytics'
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-purple-400 hover:bg-slate-900'
          }`}
          title="Chat Analytics & Stats"
        >
          <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
          <span>Stats</span>
        </button>

        <button
          onClick={onOpenSearch}
          className="py-1.5 px-1 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
          title="Global Search"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Search</span>
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
                      src={conv.avatarUrl ? getMediaUrl(conv.avatarUrl) : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(conv.name)}`}
                      alt={conv.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-700/50"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(conv.name)}`;
                      }}
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
