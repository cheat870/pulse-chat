import React, { useState, useEffect } from 'react';
import { BarChart2, Check } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function PollMessage({ message }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  let pollData;
  try {
    pollData = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
  } catch {
    return null;
  }

  const [votes, setVotes] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPoll = async () => {
    if (!pollData?.pollId) return;
    try {
      const d = await apiRequest(`/polls/${pollData.pollId}`);
      setVotes(d.poll.votes || []);
      setUserVote(d.poll.userVote ?? null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [pollData?.pollId]);

  useEffect(() => {
    if (!socket || !pollData?.pollId) return;
    const handler = (data) => {
      if (data.pollId === pollData.pollId) {
        setVotes(data.votes || []);
        if (data.userId === user?.id) setUserVote(data.optionIndex);
      }
    };
    socket.on('poll_updated', handler);
    return () => socket.off('poll_updated', handler);
  }, [socket, pollData?.pollId]);

  const totalVotes = votes.reduce((sum, v) => sum + (v.count || 0), 0);

  const handleVote = async (optionIndex) => {
    if (!pollData?.pollId || loading) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/polls/${pollData.pollId}/vote`, 'POST', { optionIndex });
      setVotes(data.votes || []);
      setUserVote(optionIndex);
    } catch (err) {
      alert(err.message || 'Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  if (!pollData?.options) return null;

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 max-w-xs sm:max-w-sm space-y-3 shadow-md my-1">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
          <BarChart2 className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs sm:text-sm font-bold text-white leading-snug">{pollData.question}</p>
      </div>

      <div className="space-y-2">
        {pollData.options.map((option, i) => {
          const voteData = votes.find(v => v.option_index === i);
          const count = voteData?.count || 0;
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isVoted = userVote === i;

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={loading}
              className={`w-full relative overflow-hidden rounded-xl border text-left px-3 py-2.5 transition-all ${
                isVoted
                  ? 'border-indigo-500 bg-indigo-950/40 shadow-sm'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
              }`}
            >
              <div
                className={`absolute left-0 top-0 bottom-0 transition-all rounded-xl ${
                  isVoted ? 'bg-indigo-600/30' : 'bg-slate-800/40'
                }`}
                style={{ width: `${percent}%` }}
              />
              <div className="relative flex items-center justify-between z-10">
                <span className={`text-xs font-medium ${isVoted ? 'text-indigo-200 font-bold' : 'text-slate-200'}`}>
                  {option}
                </span>
                <div className="flex items-center gap-1.5">
                  {isVoted && <Check className="w-3.5 h-3.5 text-indigo-400 font-bold" />}
                  <span className="text-[10px] text-slate-400 font-semibold">{percent}% ({count})</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
        <span>{totalVotes} total vote{totalVotes !== 1 ? 's' : ''}</span>
        {userVote !== null && <span className="text-indigo-400 font-medium">✓ You voted</span>}
      </div>
    </div>
  );
}
