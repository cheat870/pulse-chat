import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { UserPlus, Users, Mail, Search, Check, X, MessageSquare, Trash2, ShieldCheck, Clock, UserCheck } from 'lucide-react';

export default function FriendsView({ onStartChat }) {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('friends'); // 'find', 'requests', 'friends'

  // Data States
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Fetch Friends List
  const fetchFriends = async () => {
    try {
      const data = await apiRequest('/friends');
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  // Fetch Requests
  const fetchRequests = async () => {
    try {
      const data = await apiRequest('/friends/requests');
      setIncomingRequests(data.incoming || []);
      setOutgoingRequests(data.outgoing || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  // Real-time updates via Socket
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = () => {
      fetchRequests();
    };

    const handleAccepted = () => {
      fetchFriends();
      fetchRequests();
    };

    socket.on('incoming_friend_request', handleIncoming);
    socket.on('friend_request_accepted', handleAccepted);

    return () => {
      socket.off('incoming_friend_request', handleIncoming);
      socket.off('friend_request_accepted', handleAccepted);
    };
  }, [socket]);

  // Search People
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiRequest(`/users/search?query=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(data.users || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Action Handlers
  const handleSendRequest = async (targetUser) => {
    setActionLoading(prev => ({ ...prev, [targetUser.id]: true }));
    try {
      const data = await apiRequest('/friends/request', 'POST', { targetUserId: targetUser.id });
      if (socket) {
        socket.emit('friend_request', { targetUserId: targetUser.id, requestId: data.friendshipId });
      }
      fetchRequests();
      // Update local search state
      setSearchResults(prev => prev.map(u => u.id === targetUser.id ? { ...u, friendshipStatus: 'PENDING_SENT' } : u));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const handleAccept = async (request) => {
    setActionLoading(prev => ({ ...prev, [request.requestId]: true }));
    try {
      await apiRequest(`/friends/request/${request.requestId}/accept`, 'PUT');
      if (socket) {
        socket.emit('friend_accept', { targetUserId: request.senderId, requestId: request.requestId });
      }
      fetchFriends();
      fetchRequests();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [request.requestId]: false }));
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      await apiRequest(`/friends/request/${requestId}/reject`, 'PUT');
      fetchRequests();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleCancel = async (requestId) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      await apiRequest(`/friends/request/${requestId}/cancel`, 'DELETE');
      fetchRequests();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    try {
      await apiRequest(`/friends/${friendId}`, 'DELETE');
      fetchFriends();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Top Bar Header */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 font-display">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Friends Center</span>
          </h2>
          <p className="text-xs text-slate-400">Connect, manage friend requests, and start instant conversations</p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'friends'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>My Friends ({friends.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`relative px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-rose-500 text-white font-bold rounded-full animate-pulse">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('find')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'find'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Find People</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        
        {/* TAB 1: MY FRIENDS */}
        {activeTab === 'friends' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {friends.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-950/40 rounded-3xl border border-slate-800">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-300">No Friends Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Find new people or check your friend requests to build your real-time chat network.
                </p>
                <button
                  onClick={() => setActiveTab('find')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
                >
                  Find People
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {friends.map(friend => (
                  <div
                    key={friend.id}
                    className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <img
                          src={friend.avatar_url}
                          alt={friend.username}
                          className="w-12 h-12 rounded-full object-cover border border-slate-700"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                            friend.is_online ? 'bg-emerald-500' : 'bg-slate-500'
                          }`}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {friend.username}
                        </h4>
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">
                          {friend.status_text || 'Available'}
                        </p>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {friend.is_online ? '⚡ Online' : `Last seen ${new Date(friend.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onStartChat(friend.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        title="Remove Friend"
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FRIEND REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Incoming Requests */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>Incoming Requests</span>
                <span className="px-2 py-0.5 text-xs bg-indigo-950 text-indigo-300 rounded-full border border-indigo-800">
                  {incomingRequests.length}
                </span>
              </h3>

              {incomingRequests.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending incoming friend requests.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingRequests.map(req => (
                    <div key={req.requestId} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={req.avatar_url} alt={req.username} className="w-11 h-11 rounded-full object-cover border border-slate-700" />
                        <div>
                          <h4 className="text-sm font-bold text-white">{req.username}</h4>
                          <span className="text-xs text-slate-400 block">{req.mutualFriends} mutual friends</span>
                          <span className="text-[10px] text-slate-500">{new Date(req.requestDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAccept(req)}
                          disabled={actionLoading[req.requestId]}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-md transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleReject(req.requestId)}
                          disabled={actionLoading[req.requestId]}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Sent Requests */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>Sent Requests</span>
                <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                  {outgoingRequests.length}
                </span>
              </h3>

              {outgoingRequests.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No pending sent requests.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {outgoingRequests.map(req => (
                    <div key={req.requestId} className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={req.avatar_url} alt={req.username} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                        <div>
                          <h4 className="text-sm font-bold text-white">{req.username}</h4>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending confirmation
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancel(req.requestId)}
                        disabled={actionLoading[req.requestId]}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FIND PEOPLE */}
        {activeTab === 'find' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search people by username, email, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              />
            </div>

            {/* Search Results */}
            {loading ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <span className="text-xs text-slate-500 mt-2 block">Searching network...</span>
              </div>
            ) : searchQuery && searchResults.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/30 rounded-2xl border border-slate-800">
                <p className="text-sm text-slate-400">No users found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map(user => (
                  <div key={user.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <img src={user.avatar_url} alt={user.username} className="w-11 h-11 rounded-full object-cover border border-slate-700" />
                      <div>
                        <h4 className="text-sm font-bold text-white">{user.username}</h4>
                        <p className="text-xs text-slate-400">{user.status_text || user.email}</p>
                      </div>
                    </div>

                    <div>
                      {user.friendshipStatus === 'FRIENDS' && (
                        <button
                          onClick={() => onStartChat(user.id)}
                          className="px-3.5 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </button>
                      )}

                      {user.friendshipStatus === 'PENDING_SENT' && (
                        <span className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-700">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Request Sent</span>
                        </span>
                      )}

                      {user.friendshipStatus === 'NONE' && (
                        <button
                          onClick={() => handleSendRequest(user)}
                          disabled={actionLoading[user.id]}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Friend</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
