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
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    // OpenRelay Public TURN servers for 4G/LTE NAT Traversal
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [callState, setCallState] = useState(null);
  // callState shape: { type: 'voice'|'video', status: 'incoming'|'outgoing'|'connected', peer: { id, name, avatar }, _offer }

  const callStateRef = useRef(null);
  callStateRef.current = callState;

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
          g.gain.linearRampToValueAtTime(0.2, t + i * 0.15 + 0.14);
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
      console.log('⚡ WebRTC ontrack received track:', e.track.kind, e.track.id);
      let stream = remoteStreamRef.current;
      if (!stream) {
        stream = new MediaStream();
      }
      
      if (!stream.getTracks().some(t => t.id === e.track.id)) {
        stream.addTrack(e.track);
      }

      e.track.onunmute = () => {
        console.log('⚡ WebRTC track onunmute:', e.track.kind);
        const fresh = new MediaStream(stream.getTracks());
        remoteStreamRef.current = fresh;
        setRemoteStream(fresh);
      };

      const updated = new MediaStream(stream.getTracks());
      remoteStreamRef.current = updated;
      setRemoteStream(updated);
    };

    pc.onconnectionstatechange = () => {
      console.log('⚡ WebRTC Connection State:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState(prev => prev ? { ...prev, status: 'connected' } : prev);
        stopRingtone();
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
    if (callStateRef.current) return;
    try {
      const isVideo = type === 'video';
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: isVideo ? {
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30, max: 30 }
        } : false
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
    const current = callStateRef.current;
    if (!current || current.status !== 'incoming') return;
    stopRingtone();
    try {
      const isVideo = current.type === 'video';
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: isVideo ? {
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30, max: 30 }
        } : false
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

      const pc = createPeerConnection(current.peer.id);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(current._offer));
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });
      await pc.setLocalDescription(answer);

      socket.emit('call_accepted', { targetUserId: current.peer.id, answer });
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
    const current = callStateRef.current;
    if (current?.peer?.id && socket) {
      socket.emit('call_rejected', { targetUserId: current.peer.id });
    }
    cleanup();
  };

  const endCall = () => {
    const current = callStateRef.current;
    if (current?.peer?.id && socket) {
      socket.emit('call_ended', { targetUserId: current.peer.id });
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

  // ── Screen Share ──────────────────────────────────────────────────────
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);

  const toggleScreenShare = async () => {
    const current = callStateRef.current;
    if (!current || current.status !== 'connected') return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in peer connection
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        // Also replace in local stream for preview
        const localStream = localStreamRef.current;
        if (localStream) {
          localStream.getVideoTracks().forEach(t => localStream.removeTrack(t));
          localStream.addTrack(screenTrack);
          setLocalStream(new MediaStream(localStream.getTracks()));
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          _restoreCameraTrack(current.peer?.id);
        };

        setIsScreenSharing(true);
        if (socket && current.peer?.id) {
          socket.emit('screen_share_start', { targetUserId: current.peer.id });
        }
      } catch (err) {
        console.warn('Screen share failed:', err.message);
      }
    } else {
      _restoreCameraTrack(current.peer?.id);
    }
  };

  const _restoreCameraTrack = async (targetUserId) => {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      const camTrack = camStream.getVideoTracks()[0];

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(camTrack);
      }

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => {
          t.stop();
          localStreamRef.current.removeTrack(t);
        });
        localStreamRef.current.addTrack(camTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }

      setIsScreenSharing(false);
      if (socket && targetUserId) {
        socket.emit('screen_share_stop', { targetUserId });
      }
    } catch (err) {
      console.warn('Restore camera failed:', err.message);
    }
  };

  // ── Group Call State ──────────────────────────────────────────────────
  const [groupCallState, setGroupCallState] = useState(null);
  // groupCallState: { conversationId, type, participants: [{ userId, username, stream, isMuted, isCamOff }] }
  const groupPCsRef = useRef({}); // Map userId -> RTCPeerConnection

  const startGroupCall = async (conversationId, members, type = 'voice') => {
    try {
      const isVideo = type === 'video';
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: isVideo ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      setGroupCallState({
        conversationId,
        type,
        participants: [{ userId: user.id, username: user.username, stream, isMuted: false, isCamOff: false }]
      });

      if (socket) {
        socket.emit('group_call_join', { conversationId, callType: type });
      }
    } catch (err) {
      console.error('Group call start error:', err);
      alert('Could not access microphone/camera.');
    }
  };

  const leaveGroupCall = () => {
    if (groupCallState?.conversationId && socket) {
      socket.emit('group_call_leave', { conversationId: groupCallState.conversationId });
    }
    Object.values(groupPCsRef.current).forEach(pc => { try { pc.close(); } catch(e){} });
    groupPCsRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setGroupCallState(null);
  };

  // ── Socket Event Handlers (Bound Once Per Socket) ─────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleCallRequest = async ({ callerId, callerName, callerAvatar, callType, offer }) => {
      if (callStateRef.current) {
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
    };

    const handleCallAccepted = async ({ answer }) => {
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
    };

    const handleCallRejected = () => {
      cleanup();
      alert('Call was declined.');
    };

    const handleCallEnded = () => {
      cleanup();
    };

    const handleIceCandidate = async ({ candidate }) => {
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
    };

    const handleScreenShareStart = ({ fromUserId }) => {
      console.log('📺 Peer started screen sharing');
      setCallState(prev => prev ? { ...prev, peerIsScreenSharing: true } : prev);
    };

    const handleScreenShareStop = ({ fromUserId }) => {
      console.log('📺 Peer stopped screen sharing');
      setCallState(prev => prev ? { ...prev, peerIsScreenSharing: false } : prev);
    };

    // Group Call handlers
    const handleGroupPeerJoined = async ({ userId: peerId, username }) => {
      if (!localStreamRef.current) return;
      const pc = new RTCPeerConnection(ICE_SERVERS);
      groupPCsRef.current[peerId] = pc;

      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('group_call_ice', { targetUserId: peerId, candidate: e.candidate });
      };

      pc.ontrack = (e) => {
        const stream = new MediaStream();
        e.streams[0]?.getTracks().forEach(t => stream.addTrack(t));
        setGroupCallState(prev => {
          if (!prev) return prev;
          const existing = prev.participants.find(p => p.userId === peerId);
          if (existing) {
            return { ...prev, participants: prev.participants.map(p => p.userId === peerId ? { ...p, stream } : p) };
          }
          return { ...prev, participants: [...prev.participants, { userId: peerId, username, stream, isMuted: false, isCamOff: false }] };
        });
      };

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      socket.emit('group_call_offer', { targetUserId: peerId, offer, conversationId: groupCallState?.conversationId });
    };

    const handleGroupOffer = async ({ fromUserId, fromUsername, offer }) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      groupPCsRef.current[fromUserId] = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('group_call_ice', { targetUserId: fromUserId, candidate: e.candidate });
      };

      pc.ontrack = (e) => {
        const stream = new MediaStream();
        e.streams[0]?.getTracks().forEach(t => stream.addTrack(t));
        setGroupCallState(prev => {
          if (!prev) return prev;
          const exists = prev.participants.find(p => p.userId === fromUserId);
          if (exists) return { ...prev, participants: prev.participants.map(p => p.userId === fromUserId ? { ...p, stream } : p) };
          return { ...prev, participants: [...prev.participants, { userId: fromUserId, username: fromUsername, stream, isMuted: false, isCamOff: false }] };
        });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(answer);
      socket.emit('group_call_answer', { targetUserId: fromUserId, answer });
    };

    const handleGroupAnswer = async ({ fromUserId, answer }) => {
      const pc = groupPCsRef.current[fromUserId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleGroupIce = async ({ fromUserId, candidate }) => {
      const pc = groupPCsRef.current[fromUserId];
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e){}
      }
    };

    const handleGroupPeerLeft = ({ userId: peerId }) => {
      const pc = groupPCsRef.current[peerId];
      if (pc) { try { pc.close(); } catch(e){} delete groupPCsRef.current[peerId]; }
      setGroupCallState(prev => prev ? { ...prev, participants: prev.participants.filter(p => p.userId !== peerId) } : prev);
    };

    socket.on('call_request', handleCallRequest);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('screen_share_start', handleScreenShareStart);
    socket.on('screen_share_stop', handleScreenShareStop);
    socket.on('group_call_peer_joined', handleGroupPeerJoined);
    socket.on('group_call_offer', handleGroupOffer);
    socket.on('group_call_answer', handleGroupAnswer);
    socket.on('group_call_ice', handleGroupIce);
    socket.on('group_call_peer_left', handleGroupPeerLeft);

    return () => {
      socket.off('call_request', handleCallRequest);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('screen_share_start', handleScreenShareStart);
      socket.off('screen_share_stop', handleScreenShareStop);
      socket.off('group_call_peer_joined', handleGroupPeerJoined);
      socket.off('group_call_offer', handleGroupOffer);
      socket.off('group_call_answer', handleGroupAnswer);
      socket.off('group_call_ice', handleGroupIce);
      socket.off('group_call_peer_left', handleGroupPeerLeft);
    };
  }, [socket]);

  return (
    <CallContext.Provider value={{
      callState, localStream, remoteStream,
      isMuted, isCamOff,
      isScreenSharing,
      groupCallState,
      startCall, acceptCall, rejectCall, endCall,
      toggleMute, toggleCamera, toggleScreenShare,
      startGroupCall, leaveGroupCall
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
