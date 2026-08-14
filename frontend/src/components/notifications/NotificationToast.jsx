import React, { useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { MessageSquare, UserPlus, X, ChevronRight } from 'lucide-react';

export default function NotificationToast({ onSelectConversation, onOpenFriends }) {
  const {
    messageNotification,
    clearMessageNotification,
    friendRequestNotification,
    clearNotification
  } = useSocket();

  // Auto-hide message notification after 5 seconds
  useEffect(() => {
    if (messageNotification) {
      const timer = setTimeout(() => {
        clearMessageNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [messageNotification]);

  // Auto-hide friend request notification after 6 seconds
  useEffect(() => {
    if (friendRequestNotification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [friendRequestNotification]);

  if (!messageNotification && !friendRequestNotification) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      
      {/* New Message Alert Toast */}
      {messageNotification && (
        <div
          onClick={() => {
            if (onSelectConversation) onSelectConversation(messageNotification.conversationId);
            clearMessageNotification();
          }}
          className="pointer-events-auto bg-slate-900/95 border border-indigo-500/40 text-white p-4 rounded-2xl shadow-2xl shadow-indigo-950/80 backdrop-blur-xl flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all transform animate-bounce-short"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={messageNotification.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${messageNotification.senderName}`}
                alt={messageNotification.senderName}
                className="w-11 h-11 rounded-full object-cover border-2 border-indigo-500 shadow-md"
              />
              <span className="absolute -top-1 -right-1 p-1 bg-indigo-600 rounded-full text-white">
                <MessageSquare className="w-3 h-3" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-extrabold text-indigo-300 font-display flex items-center gap-1.5">
                <span>{messageNotification.senderName}</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-normal">New Message</span>
              </h4>
              <p className="text-xs text-slate-200 truncate mt-0.5 font-medium">
                {messageNotification.content}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <ChevronRight className="w-4 h-4 text-indigo-400" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearMessageNotification();
              }}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Friend Request Notification Toast */}
      {friendRequestNotification && (
        <div
          onClick={() => {
            if (onOpenFriends) onOpenFriends();
            clearNotification();
          }}
          className="pointer-events-auto bg-slate-900/95 border border-emerald-500/40 text-white p-4 rounded-2xl shadow-2xl shadow-emerald-950/80 backdrop-blur-xl flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all transform"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-extrabold text-emerald-400 font-display">
                New Friend Request!
              </h4>
              <p className="text-xs text-slate-200 truncate mt-0.5 font-medium">
                <strong>{friendRequestNotification.senderUsername}</strong> sent you a friend request.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearNotification();
              }}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
