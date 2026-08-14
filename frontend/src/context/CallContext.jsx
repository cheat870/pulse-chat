import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [callState, setCallState] = useState(null);
  // callState shape: { type: 'voice'|'video', status: 'incoming'|'outgoing'|'connected', peer: { id, name, avatar } }

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pcRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const ringtoneRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      let t = ctx.currentTime;
      const play = () => {
        [523, 659, 784].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = freq;
          o.type = 'sine';
          g.gain.setValueAtTime(0, t + i * 0.15);
          g.gain.linearRampToValueAtTime(0.3, t + i * 0.15 + 0.05);
          g.gain.linearRampToValueAtTime(0, t + i * 0.15 + 0.14);
          o.start(t + i * 0.15);
          o.stop(t + i * 0.15 + 0.15);
        });
        t += 0.7;
      };
      play();
      ringtoneRef.current = setInterval(play, 700);
    } catch (e) {}
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
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState(null);
    setIsMuted(false);
    setIsCamOff(false);
  };

  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('webrtc_ice_candidate', { targetUserId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState(prev => prev ? { ...prev, status: 'connected' } : prev);
        stopRingtone();
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        cleanup();
      }
    };

    return pc;
  };

  // ── Start Call (Outgoing) ─────────────────────────────────────────────
  const startCall = async (peer, type = 'voice') => {
    if (callState) return;
    try {
      const constraints = { audio: true, video: type === 'video' ? { width: 1280, height: 720 } : false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(peer.id);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setCallState({ type, status: 'outgoing', peer });
      playRingtone();

      socket.emit('call_request', {
        targetUserId: peer.id,
        callType: type,
        callerName: user.username,
        callerAvatar: user.avatar_url,
        offer
      });
    } catch (err) {
      console.error('Start call error:', err);
      cleanup();
      alert('Could not access microphone/camera. Please check permissions.');
    }
  };

  // ── Accept Incoming Call ──────────────────────────────────────────────
  const acceptCall = async () => {
    if (!callState || callState.status !== 'incoming') return;
    stopRingtone();
    try {
      const constraints = {
        audio: true,
        video: callState.type === 'video' ? { width: 1280, height: 720 } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(callState.peer.id);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(callState._offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call_accepted', { targetUserId: callState.peer.id, answer });
      setCallState(prev => ({ ...prev, status: 'connected' }));
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
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(m => !m);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
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
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState(prev => prev ? { ...prev, status: 'connected' } : prev);
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
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {}
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
