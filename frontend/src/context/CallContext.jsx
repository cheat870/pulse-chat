import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [callState, setCallState] = useState(null);
  // callState shape: { type: 'voice'|'video', status: 'incoming'|'outgoing'|'connected', peer: { id, name, avatar }, _offer }

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pcRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const ringtoneRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const playRingtone = () => {
    stopRingtone();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      let t = ctx.currentTime;
      const play = () => {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        [523, 659, 784].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = freq;
          o.type = 'sine';
          g.gain.setValueAtTime(0, t + i * 0.15);
          g.gain.linearRampToValueAtTime(0.2, t + i * 0.15 + 0.05);
          g.gain.linearRampToValueAtTime(0, t + i * 0.15 + 0.14);
          o.start(t + i * 0.15);
          o.stop(t + i * 0.15 + 0.15);
        });
        t += 0.7;
      };
      play();
      ringtoneRef.current = setInterval(play, 700);
    } catch (e) {
      console.warn('Ringtone play error:', e);
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current);
      ringtoneRef.current = null;
    }
  };

  const cleanup = () => {
    stopRingtone();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState(null);
    setIsMuted(false);
    setIsCamOff(false);
  };

  const drainPendingCandidates = async (pc) => {
    while (pendingCandidatesRef.current.length > 0) {
      const cand = pendingCandidatesRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('Error adding queued ICE candidate:', err);
      }
    }
  };

  const createPeerConnection = (targetUserId) => {
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('webrtc_ice_candidate', { targetUserId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      console.log('⚡ WebRTC ontrack received:', e.streams);
      const stream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      console.log('⚡ WebRTC Connection State:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState(prev => prev ? { ...prev, status: 'connected' } : prev);
        stopRingtone();
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        cleanup();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('⚡ WebRTC ICE Connection State:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallState(prev => prev ? { ...prev, status: 'connected' } : prev);
        stopRingtone();
      }
    };

    return pc;
  };

  // ── Start Call (Outgoing) ─────────────────────────────────────────────
  const startCall = async (peer, type = 'voice') => {
    if (callState) return;
    try {
      const isVideo = type === 'video';
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        if (isVideo) {
          // Fallback to audio only if video camera is unavailable
          console.warn('Video access failed, falling back to audio only');
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw mediaErr;
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(peer.id);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });
      await pc.setLocalDescription(offer);

      setCallState({ type, status: 'outgoing', peer });
      playRingtone();

      socket.emit('call_request', {
        targetUserId: peer.id,
        callType: type,
        callerName: user?.username || 'User',
        callerAvatar: user?.avatar_url,
        offer
      });
    } catch (err) {
      console.error('Start call error:', err);
      cleanup();
      alert('Could not access microphone/camera. Please check device permissions.');
    }
  };

  // ── Accept Incoming Call ──────────────────────────────────────────────
  const acceptCall = async () => {
    if (!callState || callState.status !== 'incoming') return;
    stopRingtone();
    try {
      const isVideo = callState.type === 'video';
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        if (isVideo) {
          console.warn('Video access failed, falling back to audio only');
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw mediaErr;
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(callState.peer.id);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(callState._offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call_accepted', { targetUserId: callState.peer.id, answer });
      setCallState(prev => ({ ...prev, status: 'connected' }));

      // Drain any queued ICE candidates
      await drainPendingCandidates(pc);
    } catch (err) {
      console.error('Accept call error:', err);
      rejectCall();
    }
  };

  // ── Reject / End Call ─────────────────────────────────────────────────
  const rejectCall = () => {
    if (callState?.peer?.id && socket) {
      socket.emit('call_rejected', { targetUserId: callState.peer.id });
    }
    cleanup();
  };

  const endCall = () => {
    if (callState?.peer?.id && socket) {
      socket.emit('call_ended', { targetUserId: callState.peer.id });
    }
    cleanup();
  };

  // ── Mute / Camera Toggle ──────────────────────────────────────────────
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setIsMuted(m => !m);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setIsCamOff(c => !c);
    }
  };

  // ── Socket Event Handlers ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('call_request', async ({ callerId, callerName, callerAvatar, callType, offer }) => {
      if (callState) {
        socket.emit('call_rejected', { targetUserId: callerId });
        return;
      }
      setCallState({
        type: callType || 'voice',
        status: 'incoming',
        peer: { id: callerId, name: callerName, avatar: callerAvatar },
        _offer: offer
      });
      playRingtone();
    });

    socket.on('call_accepted', async ({ answer }) => {
      stopRingtone();
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallState(prev => prev ? { ...prev, status: 'connected' } : prev);
          await drainPendingCandidates(pcRef.current);
        } catch (err) {
          console.error('Error handling call_accepted answer:', err);
        }
      }
    });

    socket.on('call_rejected', () => {
      cleanup();
      alert('Call was declined.');
    });

    socket.on('call_ended', () => {
      cleanup();
    });

    socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      try {
        if (!candidate) return;
        if (pcRef.current && pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (e) {
        console.warn('ICE candidate handling error:', e);
      }
    });

    return () => {
      socket.off('call_request');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_ended');
      socket.off('webrtc_ice_candidate');
    };
  }, [socket, callState]);

  return (
    <CallContext.Provider value={{
      callState, localStream, remoteStream,
      isMuted, isCamOff,
      startCall, acceptCall, rejectCall, endCall,
      toggleMute, toggleCamera
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
