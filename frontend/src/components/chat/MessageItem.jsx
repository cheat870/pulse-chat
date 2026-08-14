import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Play, Pause, Download, MapPin, Smile, Reply, Edit3, Trash2, Copy, Check, CheckCheck, FileText, Film } from 'lucide-react';

export default function MessageItem({ message, onReply, onEdit, onDelete, onReaction }) {
  const { user } = useAuth();
  const isMe = message.sender_id === user.id;

  // Media & Player States
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const audioRef = React.useRef(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setAudioProgress(progress || 0);
  };

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reactionsList = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  const isReadByOthers = message.reads && message.reads.some(r => r.user_id !== user.id);

  return (
    <div className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'} group relative`}>
      {/* Sender Name in Groups */}
      {!isMe && (
        <span className="text-[11px] font-semibold text-slate-400 mb-1 ml-1">
          {message.senderName}
        </span>
      )}

      {/* Reply Quote Card */}
      {message.replyTo && (
        <div className={`mb-1 p-2 rounded-xl text-xs border-l-2 max-w-sm ${
          isMe ? 'bg-indigo-950/40 border-indigo-400 text-indigo-200' : 'bg-slate-800/60 border-slate-500 text-slate-300'
        }`}>
          <span className="font-semibold block text-[10px] opacity-75">{message.replyTo.senderName}</span>
          <p className="truncate">{message.replyTo.content || message.replyTo.type}</p>
        </div>
      )}

      {/* Main Message Bubble Container */}
      <div className="relative flex items-center gap-2 max-w-[85%] sm:max-w-md">
        
        {/* Action Menu Trigger (Hover) */}
        <div className={`hidden group-hover:flex items-center gap-1 text-slate-400 ${isMe ? 'order-first' : 'order-last'}`}>
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-all"
            title="React"
          >
            <Smile className="w-4 h-4" />
          </button>
          <button
            onClick={() => onReply(message)}
            className="p-1 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            •••
          </button>
        </div>

        {/* Message Bubble Body */}
        <div className={`p-3.5 shadow-md transition-all ${
          isMe ? 'chat-bubble-sent' : 'chat-bubble-received'
        } ${message.is_deleted ? 'italic opacity-60' : ''}`}>
          
          {/* TEXT MESSAGE */}
          {message.type === 'TEXT' && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          )}

          {/* VOICE MESSAGE */}
          {message.type === 'VOICE' && (
            <div className="flex items-center gap-3 min-w-[200px]">
              <audio
                ref={audioRef}
                src={message.media_url}
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={() => { setIsPlayingAudio(false); setAudioProgress(0); }}
                className="hidden"
              />
              <button
                onClick={toggleAudio}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all shadow"
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1">
                <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all" style={{ width: `${audioProgress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-mono opacity-80">
                  <span>Voice Note</span>
                  <span>{message.duration ? `${Math.round(message.duration)}s` : '0:00'}</span>
                </div>
              </div>
            </div>
          )}

          {/* PHOTO MESSAGE */}
          {message.type === 'PHOTO' && (
            <div className="space-y-2">
              <img
                src={message.media_url}
                alt="Attachment"
                className="max-h-72 w-full object-cover rounded-xl border border-black/10"
              />
              {message.content && <p className="text-sm mt-1">{message.content}</p>}
            </div>
          )}

          {/* VIDEO MESSAGE */}
          {message.type === 'VIDEO' && (
            <div className="space-y-2">
              <video
                src={message.media_url}
                controls
                className="max-h-72 w-full rounded-xl border border-black/10"
              />
              {message.content && <p className="text-sm mt-1">{message.content}</p>}
            </div>
          )}

          {/* FILE ATTACHMENT */}
          {message.type === 'FILE' && (
            <div className="flex items-center gap-3 p-2.5 bg-black/10 rounded-xl border border-white/10">
              <FileText className="w-8 h-8 text-indigo-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{message.file_name || 'Attachment'}</p>
                <span className="text-[10px] opacity-75">{message.file_size ? `${(message.file_size / 1024 / 1024).toFixed(2)} MB` : 'Document'}</span>
              </div>
              <a
                href={message.media_url}
                download
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-all"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* LOCATION MESSAGE */}
          {message.type === 'LOCATION' && (
            <div className="space-y-2 min-w-[220px]">
              <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                <MapPin className="w-4 h-4" />
                <span>Shared Location</span>
              </div>
              <div className="w-full h-32 rounded-xl overflow-hidden border border-white/10 relative">
                <iframe
                  title="Location Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${message.longitude - 0.005}%2C${message.latitude - 0.005}%2C${message.longitude + 0.005}%2C${message.latitude + 0.005}&layer=mapnik&marker=${message.latitude}%2C${message.longitude}`}
                />
              </div>
              <a
                href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] underline block text-right font-medium opacity-90"
              >
                Open in Google Maps →
              </a>
            </div>
          )}

          {/* Timestamp & Status checks */}
          <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-70">
            {message.is_edited === 1 && <span>(edited)</span>}
            <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isMe && (
              <span>
                {isReadByOthers ? (
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline" />
                ) : (
                  <Check className="w-3.5 h-3.5 inline" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reactions Chip Display */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 px-1">
          {message.reactions.map((r, i) => (
            <button
              key={i}
              onClick={() => onReaction(message.id, r.emoji)}
              className="px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-full flex items-center gap-1 hover:bg-slate-700 transition-all shadow-sm"
            >
              <span>{r.emoji}</span>
              <span className="text-[10px] font-bold text-indigo-400">{r.username}</span>
            </button>
          ))}
        </div>
      )}

      {/* Popover Reaction Picker */}
      {showReactionPicker && (
        <div className="absolute -top-10 z-20 flex items-center gap-1 p-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl glass-panel">
          {reactionsList.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                onReaction(message.id, emoji);
                setShowReactionPicker(false);
              }}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-base transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Popover Context Menu */}
      {showMenu && (
        <div className="absolute top-8 z-20 w-36 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1 text-xs text-slate-200 glass-panel">
          <button
            onClick={() => { handleCopyText(); setShowMenu(false); }}
            className="w-full px-3 py-2 text-left hover:bg-slate-800 rounded-xl flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          {isMe && message.type === 'TEXT' && (
            <button
              onClick={() => { onEdit(message); setShowMenu(false); }}
              className="w-full px-3 py-2 text-left hover:bg-slate-800 rounded-xl flex items-center gap-2"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}
          {isMe && (
            <button
              onClick={() => { onDelete(message.id); setShowMenu(false); }}
              className="w-full px-3 py-2 text-left hover:bg-rose-950 text-rose-400 rounded-xl flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
