import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { apiRequest } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useSound } from '../../context/SoundContext';
import { useAuth } from '../../context/AuthContext';
import { Phone, Video, Info, ArrowLeft, Users, Shield, Circle } from 'lucide-react';

export default function ChatWindow({ conversationId, onBack, onOpenGroupInfo }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const { playChime } = useSound();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch Conversation & Messages
  const loadChat = async () => {
    try {
      setLoading(true);
      const convsData = await apiRequest('/chats');
      const currentConv = convsData.conversations.find(c => c.id === conversationId);
      setConversation(currentConv || null);

      const msgData = await apiRequest(`/messages/conversation/${conversationId}`);
      setMessages(msgData.messages || []);
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conversationId) {
      loadChat();
    }
  }, [conversationId]);

  // Socket event listeners for real-time messages & presence
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_conversation', conversationId);

    const handleNewMessage = (data) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => [...prev, data.message]);
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
      setMessages(prev => [...prev, res.message]);
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
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, content: newContent.trim(), is_edited: 1 } : m));
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Message
  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Delete this message?')) return;
    try {
      await apiRequest(`/messages/${messageId}`, 'DELETE');
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: 1, content: 'This message was deleted', media_url: null } : m));
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Reaction
  const handleToggleReaction = async (messageId, emoji) => {
    try {
      await apiRequest(`/messages/${messageId}/reaction`, 'POST', { emoji });
      loadChat(); // Refresh reactions
    } catch (err) {
      console.error('Reaction error:', err);
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
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          
          {/* Back Button for Mobile */}
          <button onClick={onBack} className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar & Online Dot */}
          <div className="relative">
            <img
              src={conversation.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=group'}
              alt={conversation.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-700"
            />
            {!isGroup && peer && (
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                peer.is_online ? 'bg-emerald-500' : 'bg-slate-500'
              }`} />
            )}
          </div>

          {/* Name & Subtitle */}
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
              <span>{conversation.name}</span>
              {isGroup && <span className="px-1.5 py-0.5 text-[10px] bg-indigo-950 text-indigo-300 rounded-md border border-indigo-800">Group</span>}
            </h3>
            
            {/* Status / Typing string */}
            <p className="text-xs text-slate-400 truncate max-w-[220px]">
              {typingUsers.size > 0 ? (
                <span className="text-indigo-400 font-semibold animate-pulse">
                  {Array.from(typingUsers).join(', ')} is typing...
                </span>
              ) : isGroup ? (
                `${conversation.members.length} members`
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
          {isGroup && (
            <button
              onClick={() => onOpenGroupInfo(conversation)}
              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-all"
              title="Group Details & Members"
            >
              <Users className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scrollable Thread */}
      <MessageList
        messages={messages}
        onReply={(msg) => setReplyToMessage(msg)}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onReaction={handleToggleReaction}
      />

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
