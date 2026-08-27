import React, { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import { getMediaUrl } from '../../services/api';
import {
  Phone, PhoneOff, Video, VideoOff,
  Mic, MicOff
} from 'lucide-react';

export default function CallModal() {
  const {
    callState, localStream, remoteStream,
    isMuted, isCamOff,
    acceptCall, rejectCall, endCall,
    toggleMute, toggleCamera
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Helper to attach stream to video/audio tag
  const attachStream = (el, stream, isMuted = false) => {
    if (!el || !stream) return;
    try {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = isMuted;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => console.log('Autoplay handled:', err.message));
      }
    } catch (e) {
      console.warn('Stream attachment error:', e);
    }
  };

  // Sync local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      attachStream(localVideoRef.current, localStream, true);
    }
  }, [localStream, callState?.status]);

  // Sync remote stream
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        attachStream(remoteVideoRef.current, remoteStream, false);
      }
      if (remoteAudioRef.current) {
        attachStream(remoteAudioRef.current, remoteStream, false);
      }
    }
  }, [remoteStream, callState?.status]);

  if (!callState) return null;

  const { type, status, peer } = callState;
  const isVideo = type === 'video';
  const isConnected = status === 'connected';
  const isIncoming = status === 'incoming';
  const isOutgoing = status === 'outgoing';

  const peerName = peer?.name || peer?.username || 'User';
  const peerAvatar = peer?.avatar
    ? getMediaUrl(peer.avatar)
    : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(peerName)}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4">
      {/* Hidden audio element for audio track playback */}
      <audio
        ref={(el) => {
          remoteAudioRef.current = el;
          if (el && remoteStream) attachStream(el, remoteStream, false);
        }}
        autoPlay
        playsInline
        className="hidden"
      />

      <div className={`relative flex flex-col items-center rounded-3xl overflow-hidden shadow-2xl transition-all duration-300
        ${isVideo && isConnected
          ? 'w-full max-w-5xl h-[85vh] min-h-[480px] bg-slate-950 border border-slate-800'
          : 'w-80 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 py-10 px-6'
        }`}
      >
        {/* ── VIDEO CALL CONNECTED MODE ── */}
        {isVideo && isConnected ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden">
            
            {/* Remote Video (Full Screen background feed) */}
            <video
              ref={(el) => {
                remoteVideoRef.current = el;
                if (el && remoteStream) attachStream(el, remoteStream, false);
              }}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              className="absolute inset-0 w-full h-full object-cover bg-black"
            />

            {/* Local Video (PiP corner) */}
            <div className="absolute top-4 right-4 w-32 h-24 sm:w-44 sm:h-32 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900 z-20">
              <video
                ref={(el) => {
                  localVideoRef.current = el;
                  if (el && localStream) attachStream(el, localStream, true);
                }}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                className="w-full h-full object-cover"
              />
              {isCamOff && (
                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-slate-400" />
                </div>
              )}
            </div>

            {/* Caller Name Tag */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 rounded-2xl px-3 py-1.5 backdrop-blur-md border border-white/10 z-20">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-white text-xs sm:text-sm font-semibold">{peerName}</span>
            </div>

            {/* Video Controls Dock */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 px-6 py-3 rounded-full backdrop-blur-xl border border-white/15 shadow-2xl z-20">
              <button
                type="button"
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isMuted ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all text-white transform hover:scale-105"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isCamOff ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={isCamOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ) : (
          /* ── VOICE CALL / WAITING SCREEN ── */
          <>
            {/* User Avatar */}
            <div className="relative mb-5">
              <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${
                isConnected ? 'border-emerald-400 shadow-lg shadow-emerald-400/40' : 'border-indigo-500 shadow-lg shadow-indigo-500/40'
              }`}>
                <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
              </div>
              {/* Animated Pulse Rings */}
              {!isConnected && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-400/30 animate-ping scale-110" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-400/20 animate-ping scale-125" style={{ animationDelay: '0.3s' }} />
                </>
              )}
            </div>

            {/* Peer Name */}
            <h2 className="text-xl font-bold text-white mb-1 font-display">{peerName}</h2>

            {/* Status Label */}
            <p className="text-sm text-slate-400 mb-8">
              {isIncoming && (isVideo ? '📹 Incoming Video Call...' : '📞 Incoming Voice Call...')}
              {isOutgoing && 'Ringing...'}
              {isConnected && (isVideo ? '📹 Video Call Connected' : '📞 Voice Call Connected')}
            </p>

            {/* ── INCOMING CALL ACTION BUTTONS ── */}
            {isIncoming && (
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={rejectCall}
                    className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all text-white"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <span className="text-xs text-slate-400">Decline</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={acceptCall}
                    className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-all text-white animate-bounce"
                  >
                    <Phone className="w-7 h-7" />
                  </button>
                  <span className="text-xs text-slate-400">Accept</span>
                </div>
              </div>
            )}

            {/* ── OUTGOING / CONNECTED CONTROLS ── */}
            {(isOutgoing || isConnected) && (
              <div className="flex items-center gap-4">
                {isConnected && (
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isMuted ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                  </button>
                )}

                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all text-white"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <span className="text-xs text-slate-400">{isOutgoing ? 'Cancel' : 'End'}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
