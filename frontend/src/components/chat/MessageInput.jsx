import React, { useState, useRef } from 'react';
import VoiceRecorder from './VoiceRecorder';
import LocationPickerModal from './LocationPickerModal';
import { Send, Paperclip, Mic, Smile, Image, Video, FileText, MapPin, X } from 'lucide-react';

export default function MessageInput({ onSendMessage, onTyping, replyToMessage, onCancelReply }) {
  const [text, setText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);
    onTyping();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview({ type: 'PHOTO', url: URL.createObjectURL(file), name: file.name });
      } else if (file.type.startsWith('video/')) {
        setFilePreview({ type: 'VIDEO', url: URL.createObjectURL(file), name: file.name });
      } else {
        setFilePreview({ type: 'FILE', url: null, name: file.name });
      }
      setShowAttachments(false);
    }
  };

  const handleSend = () => {
    if (!text.trim() && !selectedFile) return;

    if (selectedFile) {
      const type = selectedFile.type.startsWith('image/')
        ? 'PHOTO'
        : selectedFile.type.startsWith('video/')
        ? 'VIDEO'
        : 'FILE';

      onSendMessage({
        type,
        content: text.trim(),
        file: selectedFile,
        replyToId: replyToMessage?.id
      });
    } else {
      onSendMessage({
        type: 'TEXT',
        content: text.trim(),
        replyToId: replyToMessage?.id
      });
    }

    // Reset input
    setText('');
    setSelectedFile(null);
    setFilePreview(null);
    if (onCancelReply) onCancelReply();
  };

  const handleSendVoice = (audioBlob, duration) => {
    const voiceFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
    onSendMessage({
      type: 'VOICE',
      file: voiceFile,
      duration,
      replyToId: replyToMessage?.id
    });
    setShowVoiceRecorder(false);
    if (onCancelReply) onCancelReply();
  };

  const handleSendLocation = ({ latitude, longitude }) => {
    onSendMessage({
      type: 'LOCATION',
      latitude,
      longitude,
      replyToId: replyToMessage?.id
    });
    setShowLocationPicker(false);
    if (onCancelReply) onCancelReply();
  };

  // Common quick Emojis
  const quickEmojis = ['😀', '😂', '😍', '🔥', '👍', '🎉', '❤️', '🙌'];

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800 relative">
      
      {/* Reply Card Preview */}
      {replyToMessage && (
        <div className="mb-2 p-2 bg-slate-950 border-l-4 border-indigo-500 rounded-r-xl flex items-center justify-between text-xs">
          <div className="truncate">
            <span className="font-semibold text-indigo-400 block">Replying to {replyToMessage.senderName}</span>
            <span className="text-slate-300 truncate">{replyToMessage.content || replyToMessage.type}</span>
          </div>
          <button onClick={onCancelReply} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File Attachment Preview Card */}
      {filePreview && (
        <div className="mb-2 p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
          {filePreview.type === 'PHOTO' && <img src={filePreview.url} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />}
          {filePreview.type === 'VIDEO' && <Video className="w-8 h-8 text-purple-400" />}
          {filePreview.type === 'FILE' && <FileText className="w-8 h-8 text-indigo-400" />}
          <span className="text-xs text-slate-200 truncate flex-1">{filePreview.name}</span>
          <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="p-1 text-slate-400 hover:text-rose-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voice Recorder Active Mode */}
      {showVoiceRecorder ? (
        <VoiceRecorder
          onSendVoice={handleSendVoice}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      ) : (
        <div className="flex items-end gap-2">
          
          {/* Attachment Toggle Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachments(!showAttachments)}
              className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-all"
              title="Attach File or Media"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Attachments Popover Menu */}
            {showAttachments && (
              <div className="absolute bottom-12 left-0 z-30 w-44 bg-slate-950 border border-slate-800 rounded-2xl p-1.5 shadow-2xl space-y-1 glass-panel text-xs">
                <button
                  onClick={() => { fileInputRef.current.click(); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 rounded-xl flex items-center gap-2.5 text-slate-200"
                >
                  <Image className="w-4 h-4 text-emerald-400" />
                  <span>Photo / Image</span>
                </button>
                <button
                  onClick={() => { fileInputRef.current.click(); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 rounded-xl flex items-center gap-2.5 text-slate-200"
                >
                  <Video className="w-4 h-4 text-purple-400" />
                  <span>Video</span>
                </button>
                <button
                  onClick={() => { fileInputRef.current.click(); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 rounded-xl flex items-center gap-2.5 text-slate-200"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Document</span>
                </button>
                <button
                  onClick={() => { setShowLocationPicker(true); setShowAttachments(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 rounded-xl flex items-center gap-2.5 text-slate-200"
                >
                  <MapPin className="w-4 h-4 text-rose-400" />
                  <span>Location</span>
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Quick Emoji Strip */}
          <div className="hidden md:flex items-center gap-0.5">
            {quickEmojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setText(prev => prev + emoji)}
                className="p-1 hover:bg-slate-800 rounded-lg text-sm transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message Text Input */}
          <textarea
            rows={1}
            placeholder="Type a message..."
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none max-h-32 overflow-y-auto"
          />

          {/* Voice Mic Trigger Button (When no text) */}
          {!text.trim() && !selectedFile ? (
            <button
              type="button"
              onClick={() => setShowVoiceRecorder(true)}
              className="p-2.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl transition-all shadow"
              title="Record Voice Message"
            >
              <Mic className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/30"
              title="Send Message"
            >
              <Send className="w-5 h-5" />
            </button>
          )}

        </div>
      )}

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPickerModal
          onSelectLocation={handleSendLocation}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
}
