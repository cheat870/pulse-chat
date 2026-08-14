import React, { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import {
  Phone, PhoneOff, PhoneIncoming, Video, VideoOff,
  Mic, MicOff, X
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

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!callState) return null;

  const { type, status, peer } = callState;
  const isVideo = type === 'video';
  const isConnected = status === 'connected';
  const isIncoming = status === 'incoming';
  const isOutgoing = status === 'outgoing';

  const peerName = peer?.name || peer?.username || 'Unknown';
  const peerAvatar = peer?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(peerName)}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className={`relative flex flex-col items-center rounded-3xl overflow-hidden shadow-2xl
        ${isVideo && isConnected
          ? 'w-full h-full max-w-4xl max-h-[90vh] bg-slate-950'
          : 'w-80 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 py-10 px-6'
        }`}
      >
        {/* ── VIDEO MODE ── */}
        {isVideo && isConnected ? (
          <>
            {/* Remote Video (full) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-slate-900"
            />

            {/* Local Video (PiP corner) */}
            <div className="absolute top-4 right-4 w-32 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-slate-800">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {isCamOff && (
                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-slate-400" />
                </div>
              )}
            </div>

            {/* Caller name overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 rounded-2xl px-3 py-2 backdrop-blur-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white text-sm font-semibold">{peerName}</span>
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isMuted ? 'bg-red-500 hover:bg-red-400' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </button>

              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-600/40 transition-all"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>

              <button
                onClick={toggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isCamOff ? 'bg-red-500 hover:bg-red-400' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                {isCamOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
              </button>
            </div>
          </>
        ) : (
          /* ── VOICE / WAITING MODE ── */
          <>
            {/* Avatar */}
            <div className="relative mb-5">
              <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${
                isConnected ? 'border-green-400 shadow-lg shadow-green-400/40' : 'border-indigo-500 shadow-lg shadow-indigo-500/40'
              }`}>
                <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
              </div>
              {/* Pulse rings */}
              {!isConnected && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-400/30 animate-ping scale-110" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-400/20 animate-ping scale-125" style={{ animationDelay: '0.3s' }} />
                </>
              )}
            </div>

            {/* Name */}
            <h2 className="text-xl font-bold text-white mb-1">{peerName}</h2>

            {/* Status label */}
            <p className="text-sm text-slate-400 mb-8">
              {isIncoming && (isVideo ? '📹 Incoming Video Call...' : '📞 Incoming Voice Call...')}
              {isOutgoing && 'Ringing...'}
              {isConnected && (isVideo ? '📹 Video Call Connected' : '📞 Voice Call Connected')}
            </p>

            {/* Voice connected: local audio only */}
            {isVideo && isConnected && (
              <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
            )}
            {!isVideo && (
              <>
                <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
              </>
            )}

            {/* ── INCOMING CALL BUTTONS ── */}
            {isIncoming && (
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={rejectCall}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-600/40 transition-all"
                  >
                    <PhoneOff className="w-7 h-7 text-white" />
                  </button>
                  <span className="text-xs text-slate-400">Decline</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={acceptCall}
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-lg shadow-green-500/40 transition-all animate-bounce"
                  >
                    <Phone className="w-7 h-7 text-white" />
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
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isMuted ? 'bg-red-500 hover:bg-red-400' : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                  </button>
                )}

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-600/40 transition-all"
                  >
                    <PhoneOff className="w-7 h-7 text-white" />
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
