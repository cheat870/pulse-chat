import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SoundProvider } from './context/SoundContext';
import { SocketProvider } from './context/SocketContext';
import AuthModal from './components/auth/AuthModal';
import Sidebar from './components/chat/Sidebar';
import ChatWindow from './components/chat/ChatWindow';
import FriendsView from './components/friends/FriendsView';
import CreateGroupModal from './components/group/CreateGroupModal';
import GroupInfoModal from './components/group/GroupInfoModal';
import ProfileModal from './components/profile/ProfileModal';
import NotificationToast from './components/notifications/NotificationToast';
import { apiRequest } from './services/api';
import { MessageSquare, Sparkles, ShieldCheck } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();

  // Active View State
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'friends'
  const [activeConvId, setActiveConvId] = useState(null);

  // Modal States
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(null);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-tight font-display">Initializing PulseChat...</h2>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  // Start direct chat from Friends list
  const handleStartChatFromFriends = async (friendId) => {
    try {
      const res = await apiRequest('/chats/private', 'POST', { targetUserId: friendId });
      setActiveConvId(res.conversationId);
      setCurrentView('chat');
    } catch (err) {
      alert(err.message || 'Could not start chat');
    }
  };

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Real-time Notification Alerts */}
      <NotificationToast
        onSelectConversation={(convId) => {
          setActiveConvId(convId);
          setCurrentView('chat');
        }}
        onOpenFriends={() => setCurrentView('friends')}
      />

      {/* Sidebar Navigation */}
      <div className={`${(activeConvId || currentView === 'friends') ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full shrink-0`}>
        <Sidebar
          activeConvId={activeConvId}
          onSelectConv={(convId) => {
            setActiveConvId(convId);
            setCurrentView('chat');
          }}
          onOpenFriends={() => setCurrentView('friends')}
          onOpenGroupModal={() => setShowGroupModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
        />
      </div>

      {/* Main Content Workspace */}
      <div className={`${(!activeConvId && currentView === 'chat') ? 'hidden md:flex' : 'flex'} flex-1 h-full overflow-hidden`}>
        {currentView === 'friends' ? (
          <FriendsView
            onStartChat={handleStartChatFromFriends}
            onBack={() => setCurrentView('chat')}
          />
        ) : activeConvId ? (
          <ChatWindow
            conversationId={activeConvId}
            onBack={() => setActiveConvId(null)}
            onOpenGroupInfo={(conv) => setShowGroupInfoModal(conv)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/60">
            <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-white font-display">Welcome to PulseChat</h2>
            <p className="text-sm text-slate-400 max-w-md mt-2 mb-6">
              Select a conversation from the sidebar, or explore the Friends Center to start a new real-time private or group chat.
            </p>
            <button
              onClick={() => setCurrentView('friends')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <span>Explore Friends Center</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={(convId) => {
            setActiveConvId(convId);
            setCurrentView('chat');
          }}
        />
      )}

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {showGroupInfoModal && (
        <GroupInfoModal
          conversation={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(null)}
          onGroupUpdated={() => {
            // Force reload active chat
            const id = activeConvId;
            setActiveConvId(null);
            setTimeout(() => setActiveConvId(id), 50);
          }}
          onLeaveGroup={() => {
            setActiveConvId(null);
            setShowGroupInfoModal(null);
          }}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SoundProvider>
          <SocketProvider>
            <MainApp />
          </SocketProvider>
        </SoundProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
