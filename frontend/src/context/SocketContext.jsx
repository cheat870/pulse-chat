import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useSound } from './SoundContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const { playChime } = useSound();
  const [socket, setSocket] = useState(null);
  const [friendRequestNotification, setFriendRequestNotification] = useState(null);
  const [messageNotification, setMessageNotification] = useState(null);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket connected:', newSocket.id);
    });

    newSocket.on('incoming_friend_request', (data) => {
      console.log('📨 Incoming friend request:', data);
      playChime('friend_request');
      setFriendRequestNotification(data);
    });

    newSocket.on('friend_request_accepted', (data) => {
      console.log('🎉 Friend request accepted:', data);
      playChime('friend_request');
    });

    newSocket.on('new_message', (data) => {
      const { message } = data;
      if (message && message.sender_id !== user.id) {
        playChime('message');

        const preview = message.type === 'VOICE' ? '🎤 Voice message' :
                        message.type === 'PHOTO' ? '📷 Photo' :
                        message.type === 'VIDEO' ? '🎥 Video' :
                        message.type === 'LOCATION' ? '📍 Location' :
                        message.type === 'FILE' ? '📎 File attachment' :
                        message.content;

        setMessageNotification({
          id: message.id,
          conversationId: message.conversation_id,
          senderName: message.senderName || 'Someone',
          senderAvatar: message.senderAvatar,
          content: preview
        });

        // Trigger native desktop notification if window is blurred/hidden
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          try {
            new Notification(`💬 ${message.senderName || 'PulseChat'}`, {
              body: preview,
              icon: message.senderAvatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=pulse'
            });
          } catch (e) {}
        }
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  const clearMessageNotification = () => setMessageNotification(null);
  const clearNotification = () => setFriendRequestNotification(null);

  return (
    <SocketContext.Provider value={{
      socket,
      friendRequestNotification,
      messageNotification,
      clearNotification,
      clearMessageNotification
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
