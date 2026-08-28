import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, MessageSquare, Heart, UserPlus, Image, Sparkles } from 'lucide-react';
import { apiRequest, getMediaUrl } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const typeIcons = {
  message: <MessageSquare className="w-4 h-4 text-indigo-400" />,
  reaction: <Heart className="w-4 h-4 text-rose-400" />,
  friend_request: <UserPlus className="w-4 h-4 text-emerald-400" />,
  comment: <MessageSquare className="w-4 h-4 text-amber-400" />,
  story_view: <Image className="w-4 h-4 text-purple-400" />,
};

export default function NotificationCenter({ isOpen, onClose }) {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    try {
      const data = await apiRequest('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) fetchNotifs();
  }, [isOpen]);

  useEffect(() => {
    fetchNotifs();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(c => c + 1);
    };
    socket.on('new_notification', handleNewNotif);
    return () => socket.off('new_notification', handleNewNotif);
  }, [socket]);

  const markAllRead = async () => {
    try {
      await apiRequest('/notifications/read', 'PUT');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const deleteNotif = async (id) => {
    try {
      await apiRequest(`/notifications/${id}`, 'DELETE');
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {}
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Notifications</h3>
            {unreadCount > 0 && <span className="text-[10px] text-indigo-400 font-semibold">{unreadCount} unread</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="p-1.5 text-xs text-indigo-400 hover:bg-slate-800 rounded-xl flex items-center gap-1 font-semibold"
              title="Mark all as read"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <Sparkles className="w-6 h-6 text-slate-600" />
            <span>No notifications yet</span>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-3.5 hover:bg-slate-800/40 transition-colors ${
                !n.is_read ? 'bg-indigo-950/20' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {n.from_avatar ? (
                  <img src={getMediaUrl(n.from_avatar)} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-indigo-400">{n.from_username?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 leading-snug">{n.content}</p>
                <p className="text-[10px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {typeIcons[n.type] || <Bell className="w-3.5 h-3.5 text-slate-500" />}
                <button
                  onClick={() => deleteNotif(n.id)}
                  className="p-1 text-slate-600 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
