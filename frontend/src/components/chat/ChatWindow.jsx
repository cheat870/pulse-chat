import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import PinnedMessageBar from './PinnedMessageBar';
import SearchMessagesPanel from './SearchMessagesPanel';
import { apiRequest, getMediaUrl } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useSound } from '../../context/SoundContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { Phone, Video, Info, ArrowLeft, Users, Shield, Circle, Search, Phone as GroupPhone } from 'lucide-react';

export default function ChatWindow({ conversationId, onBack, onOpenGroupInfo }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const { playChime } = useSound();
  const { startCall } = useCall();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState(() => {
    try {
      const cached = localStorage.getItem(`pulsechat_msgs_${conversationId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const messageListRef = useRef(null);


  // Helper to update messages and save to localStorage
  const persistMessages = (updater) => {
    setMessages(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(`pulsechat_msgs_${conversationId}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Fetch Conversation & Messages
  const loadChat = async () => {
    try {
      const convsData = await apiRequest('/chats');
      const currentConv = convsData.conversations?.find(c => c.id === conversationId);
      if (currentConv) setConversation(currentConv);

      const msgData = await apiRequest(`/messages/conversation/${conversationId}`);
      if (msgData && msgData.messages) {
        setMessages(msgData.messages);
        localStorage.setItem(`pulsechat_msgs_${conversationId}`, JSON.stringify(msgData.messages));
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conversationId) {
      try {
        const cached = localStorage.getItem(`pulsechat_msgs_${conversationId}`);
        if (cached) setMessages(JSON.parse(cached));
      } catch (e) {}
      loadChat();
      loadPinnedMessages();
    }
  }, [conversationId]);

  // Load pinned messages
  const loadPinnedMessages = async () => {
    try {
      const data = await apiRequest(`/pin/conversation/${conversationId}/pinned`);
      setPinnedMessages(data.pinnedMessages || []);
    } catch (e) {}
  };

  // Pin / Unpin
  const handlePin = async (messageId) => {
    try {
      await apiRequest(`/pin/${messageId}/pin`, 'POST');
      await loadPinnedMessages();
    } catch (e) { console.error('Pin error:', e); }
  };

  const handleUnpin = async (messageId) => {
    try {
      await apiRequest(`/pin/${messageId}/pin`, 'DELETE');
      await loadPinnedMessages();
    } catch (e) { console.error('Unpin error:', e); }
  };

  // Jump to message by ID
  const handleJumpToMessage = (messageId) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-900');
      setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-900'), 2000);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false); };
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const file = files[0];
    let type = 'FILE';
    if (file.type.startsWith('image/')) type = 'PHOTO';
    else if (file.type.startsWith('video/')) type = 'VIDEO';
    else if (file.type.startsWith('audio/')) type = 'VOICE';
    await handleSendMessage({ type, file });
  };



  // Socket event listeners for real-time messages & presence
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_conversation', conversationId);

    const handleNewMessage = (data) => {
      if (data.conversationId === conversationId && data.message) {
        persistMessages(prev => {
          // Deduplicate: skip if message ID already exists (own message added locally)
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        if (data.message.sender_id !== user.id) {
          playChime('message');
        }
      }
    };

    const handleTyping = (data) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setTypingUsers(prev => new Set(prev).add(data.username));
      }
    };

    const handleStopTyping = (data) => {
      if (data.conversationId === conversationId) {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(data.username);
          return next;
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [socket, conversationId, user]);

  // Handle typing event emit
  const handleTypingEmit = () => {
    if (!socket || !conversationId) return;
    socket.emit('typing', { conversationId });
  };

  // Send Message
  const handleSendMessage = async (msgData) => {
    try {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('type', msgData.type);
      if (msgData.content) formData.append('content', msgData.content);
      if (msgData.file) formData.append('file', msgData.file);
      if (msgData.replyToId) formData.append('replyToId', msgData.replyToId);
      if (msgData.latitude) formData.append('latitude', msgData.latitude);
      if (msgData.longitude) formData.append('longitude', msgData.longitude);
      if (msgData.duration) formData.append('duration', msgData.duration);

      const res = await apiRequest('/messages/send', 'POST', formData, true);

      // Append locally and broadcast
      persistMessages(prev => [...prev, res.message]);
      if (socket) {
        socket.emit('send_message', { conversationId, message: res.message });
      }
      window.dispatchEvent(new CustomEvent('pulse_message_sent', { detail: { conversationId } }));
    } catch (err) {
      alert(err.message || 'Failed to send message');
    }
  };

  // Edit Message
  const handleEditMessage = async (message) => {
    const newContent = prompt('Edit message:', message.content);
    if (!newContent || newContent.trim() === message.content) return;

    try {
      await apiRequest(`/messages/${message.id}`, 'PUT', { content: newContent.trim() });
      persistMessages(prev => prev.map(m => m.id === message.id ? { ...m, content: newContent.trim(), is_edited: 1 } : m));
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Message
  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Delete this message?')) return;
    try {
      await apiRequest(`/messages/${messageId}`, 'DELETE');
      persistMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: 1, content: 'This message was deleted', media_url: null } : m));
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Reaction
  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const res = await apiRequest(`/messages/${messageId}/reactions`, 'POST', { emoji });
      persistMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        let nextReactions = [...(msg.reactions || [])];
        if (res.action === 'added') {
          nextReactions.push({ emoji, user_id: user.id, username: user.username });
        } else {
          nextReactions = nextReactions.filter(r => !(r.emoji === emoji && r.user_id === user.id));
        }
        return { ...msg, reactions: nextReactions };
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-400">
        Conversation not found
      </div>
    );
  }

  const isGroup = conversation.type === 'GROUP';
  const peer = conversation.peer;

  return (
    <div
      className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-indigo-500/20 border-4 border-dashed border-indigo-500 rounded-2xl flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-indigo-300">
            <svg className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 013.015 3.756A4.5 4.5 0 0117.25 19.5H6.75z" />
            </svg>
            <p className="text-lg font-bold">Drop to send file</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative">
            <img
              src={conversation.avatarUrl ? getMediaUrl(conversation.avatarUrl) : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(conversation.name)}`}
              alt={conversation.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-700"
              onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(conversation.name)}`; }}
            />
            {!isGroup && peer && (
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${peer.is_online ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
              <span>{conversation.name}</span>
              {isGroup && <span className="px-1.5 py-0.5 text-[10px] bg-indigo-950 text-indigo-300 rounded-md border border-indigo-800">Group</span>}
            </h3>
            <p className="text-xs text-slate-400 truncate max-w-[220px]">
              {typingUsers.size > 0 ? (
                <span className="text-indigo-400 font-semibold animate-pulse">{Array.from(typingUsers).join(', ')} is typing...</span>
              ) : isGroup ? (
                `${conversation.members?.length || 0} members`
              ) : peer?.is_online ? (
                <span className="text-emerald-400 font-semibold">Online</span>
              ) : (
                `Last seen ${peer?.last_seen ? new Date(peer.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'offline'}`
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Search Messages */}
          <button
            onClick={() => setShowSearch(s => !s)}
            className={`p-2 rounded-xl transition-all ${showSearch ? 'text-indigo-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Search Messages"
          >
            <Search className="w-5 h-5" />
          </button>

          {!isGroup && peer && (
            <>
              <button onClick={() => startCall({ id: peer.id, name: peer.username || conversation.name, avatar: peer.avatar_url || conversation.avatarUrl }, 'voice')} className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded-xl transition-all" title="Voice Call">
                <Phone className="w-5 h-5" />
              </button>
              <button onClick={() => startCall({ id: peer.id, name: peer.username || conversation.name, avatar: peer.avatar_url || conversation.avatarUrl }, 'video')} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-all" title="Video Call">
                <Video className="w-5 h-5" />
              </button>
            </>
          )}
          {isGroup && (
            <button onClick={() => onOpenGroupInfo(conversation)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-all" title="Group Details">
              <Users className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Pinned Messages Bar */}
      {pinnedMessages.length > 0 && (
        <PinnedMessageBar
          pinnedMessages={pinnedMessages}
          onUnpin={handleUnpin}
          onJumpTo={handleJumpToMessage}
        />
      )}

      {/* Messages Scrollable Thread */}
      <div className="flex-1 relative overflow-hidden">
        <MessageList
          messages={messages}
          onReply={(msg) => setReplyToMessage(msg)}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onReaction={handleToggleReaction}
          onPin={handlePin}
        />

        {/* Search Panel (slide in over message list) */}
        {showSearch && (
          <SearchMessagesPanel
            conversationId={conversationId}
            onJumpTo={handleJumpToMessage}
            onClose={() => setShowSearch(false)}
          />
        )}
      </div>

      {/* Input Dock */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTypingEmit}
        replyToMessage={replyToMessage}
        onCancelReply={() => setReplyToMessage(null)}
      />
    </div>
  );
}
