import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SoundProvider } from './context/SoundContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';
import CallModal from './components/call/CallModal';
import AuthModal from './components/auth/AuthModal';
import Sidebar from './components/chat/Sidebar';
import ChatWindow from './components/chat/ChatWindow';
import FeedView from './components/feed/FeedView';
import FriendsView from './components/friends/FriendsView';
import ProfilePage from './components/profile/ProfilePage';
import SavedMessagesView from './components/bookmarks/SavedMessagesView';
import AIChatView from './components/ai/AIChatView';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import GlobalSearch from './components/search/GlobalSearch';
import CreateGroupModal from './components/group/CreateGroupModal';
import GroupInfoModal from './components/group/GroupInfoModal';
import ProfileModal from './components/profile/ProfileModal';
import NotificationToast from './components/notifications/NotificationToast';
import { apiRequest } from './services/api';
import { MessageSquare, Sparkles, Bot, Globe, Bookmark } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();

  // Active View State: 'chat' | 'friends' | 'feed' | 'profile' | 'saved' | 'ai' | 'analytics'
  const [currentView, setCurrentView] = useState('chat');
  const [activeConvId, setActiveConvId] = useState(null);
  const [viewProfileUserId, setViewProfileUserId] = useState(null);

  // Modal States
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

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

  // Start direct chat from Friends list or Profile
  const handleStartChatFromFriends = async (friendId) => {
    try {
      const res = await apiRequest('/chats/private', 'POST', { targetUserId: friendId });
      setActiveConvId(res.conversationId);
      setCurrentView('chat');
    } catch (err) {
      alert(err.message || 'Could not start chat');
    }
  };

  const isFullScreenView = activeConvId || currentView !== 'chat';

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Global Call Modal */}
      <CallModal />
      
      {/* Real-time Notification Alerts */}
      <NotificationToast
        onSelectConversation={(convId) => {
          setActiveConvId(convId);
          setCurrentView('chat');
        }}
        onOpenFriends={() => setCurrentView('friends')}
      />

      {/* Global Search Dialog Modal */}
      {showSearchModal && (
        <GlobalSearch
          onClose={() => setShowSearchModal(false)}
          onSelectUser={(userId) => {
            setViewProfileUserId(userId);
            setCurrentView('profile');
            setShowSearchModal(false);
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`${isFullScreenView ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full shrink-0`}>
        <Sidebar
          activeConvId={activeConvId}
          currentView={currentView}
          onSelectConv={(convId) => {
            setActiveConvId(convId);
            setCurrentView('chat');
          }}
          onOpenFriends={() => {
            setActiveConvId(null);
            setCurrentView('friends');
          }}
          onOpenFeed={() => {
            setActiveConvId(null);
            setCurrentView('feed');
          }}
          onOpenSaved={() => {
            setActiveConvId(null);
            setCurrentView('saved');
          }}
          onOpenAI={() => {
            setActiveConvId(null);
            setCurrentView('ai');
          }}
          onOpenAnalytics={() => {
            setActiveConvId(null);
            setCurrentView('analytics');
          }}
          onOpenSearch={() => setShowSearchModal(true)}
          onOpenGroupModal={() => setShowGroupModal(true)}
          onOpenProfile={() => {
            setViewProfileUserId(user.id);
            setCurrentView('profile');
          }}
        />
      </div>

      {/* Main Content Workspace */}
      <div className={`${(!activeConvId && currentView === 'chat') ? 'hidden md:flex' : 'flex'} flex-1 h-full overflow-hidden`}>
        {currentView === 'feed' ? (
          <FeedView onBack={() => setCurrentView('chat')} />
        ) : currentView === 'friends' ? (
          <FriendsView
            onStartChat={handleStartChatFromFriends}
            onBack={() => setCurrentView('chat')}
          />
        ) : currentView === 'profile' ? (
          <ProfilePage
            userId={viewProfileUserId || user.id}
            onBack={() => setCurrentView('chat')}
            onStartChat={handleStartChatFromFriends}
          />
        ) : currentView === 'saved' ? (
          <SavedMessagesView onBack={() => setCurrentView('chat')} />
        ) : currentView === 'ai' ? (
          <AIChatView onBack={() => setCurrentView('chat')} />
        ) : currentView === 'analytics' ? (
          <AnalyticsDashboard onBack={() => setCurrentView('chat')} />
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
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-2 mb-6">
              Select a conversation from the sidebar, check the 24h Stories & Social Feed, ask PulseBot AI, or explore the Friends Center.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setCurrentView('feed')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                <span>News Feed & Stories</span>
              </button>
              <button
                onClick={() => setCurrentView('ai')}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                <span>PulseBot AI</span>
              </button>
              <button
                onClick={() => setCurrentView('friends')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs rounded-xl border border-slate-800 transition-all"
              >
                <span>Friends Center</span>
              </button>
            </div>
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
        <SocketProvider>
          <SoundProvider>
            <CallProvider>
              <MainApp />
            </CallProvider>
          </SoundProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
