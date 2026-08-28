import React, { useState, useEffect } from 'react';
import { apiRequest, getMediaUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Plus } from 'lucide-react';
import CreateStoryModal from './CreateStoryModal';
import StoryViewer from './StoryViewer';

export default function StoriesBar() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [storyGroups, setStoryGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [viewingIndex, setViewingIndex] = useState(0);

  const fetchStories = async () => {
    try {
      const d = await apiRequest('/stories');
      setStoryGroups(d.storyGroups || []);
    } catch (e) {
      console.error('Fetch stories error:', e);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewStory = () => fetchStories();
    socket.on('new_story', handleNewStory);
    return () => socket.off('new_story', handleNewStory);
  }, [socket]);

  const myStoryGroup = storyGroups.find(g => g.user.id === user?.id);
  const othersGroups = storyGroups.filter(g => g.user.id !== user?.id);
  const allGroupsOrdered = myStoryGroup ? [myStoryGroup, ...othersGroups] : othersGroups;

  const openStory = (group, idx = 0) => {
    setViewingGroup(group);
    setViewingIndex(idx);
  };

  const getRingClass = (group) => {
    const hasUnseen = group.stories.some(s => !s.has_viewed);
    return hasUnseen
      ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 shadow-md shadow-indigo-500/20'
      : 'ring-2 ring-slate-700 ring-offset-2 ring-offset-slate-950 opacity-80';
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto scrollbar-none bg-slate-900/40 rounded-3xl border border-slate-800/80 mb-4">
        {/* Add Story Button */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          title="Add Story"
        >
          <div className="relative w-13 h-13 rounded-full bg-slate-800 border-2 border-dashed border-indigo-500/80 flex items-center justify-center group-hover:border-indigo-400 transition-all p-0.5">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
              {user?.avatar_url ? (
                <img src={getMediaUrl(user.avatar_url)} className="w-full h-full rounded-full object-cover opacity-70" />
              ) : (
                <span className="text-base font-bold text-indigo-400">{user?.username?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-slate-950 shadow">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-[10px] font-medium text-slate-300 truncate max-w-[56px]">Your Story</span>
        </button>

        {/* Story Groups */}
        {allGroupsOrdered.map((group) => (
          <button
            key={group.user.id}
            onClick={() => openStory(group, 0)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          >
            <div className={`w-13 h-13 rounded-full overflow-hidden ${getRingClass(group)} cursor-pointer transition-transform group-hover:scale-105`}>
              {group.user.avatar_url ? (
                <img src={getMediaUrl(group.user.avatar_url)} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-700 flex items-center justify-center">
                  <span className="text-base font-bold text-white">{group.user.username?.[0]?.toUpperCase()}</span>
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium text-slate-300 truncate max-w-[56px]">
              {group.user.id === user?.id ? 'You' : group.user.username}
            </span>
          </button>
        ))}
      </div>

      {showCreate && (
        <CreateStoryModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            fetchStories();
            setShowCreate(false);
          }}
        />
      )}

      {viewingGroup && (
        <StoryViewer
          group={viewingGroup}
          initialIndex={viewingIndex}
          onClose={() => {
            setViewingGroup(null);
            fetchStories();
          }}
          onNextGroup={(direction) => {
            const currentIdx = allGroupsOrdered.findIndex(g => g.user.id === viewingGroup.user.id);
            const nextIdx = currentIdx + direction;
            if (nextIdx >= 0 && nextIdx < allGroupsOrdered.length) {
              setViewingGroup(allGroupsOrdered[nextIdx]);
              setViewingIndex(0);
            } else {
              setViewingGroup(null);
              fetchStories();
            }
          }}
        />
      )}
    </>
  );
}
