import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

type CallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected';

interface CallInfo {
  id: string; // Peer ID or Channel ID
  name?: string;
  video: boolean;
  audio: boolean;
  isMulti?: boolean;
}

interface PeerInfo {
  stream: MediaStream;
  name?: string;
}

interface CallContextType {
  callState: CallState;
  currentCall: CallInfo | null;
  localStream: MediaStream | null;
  remoteStreams: { [peerId: string]: PeerInfo };
  error: string | null;
  startCall: (targetUserId: string, targetName: string, video?: boolean) => void;
  joinCall: (channelId: string, channelName: string) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  micEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  clearError: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export const CallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [callState, setCallState] = useState<CallState>('idle');
  const [currentCall, setCurrentCall] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [peerId: string]: PeerInfo }>({});
  const [error, setError] = useState<string | null>(null);
  
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const pcs = useRef<{ [peerId: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    Object.values(pcs.current).forEach(pc => pc.close());
    pcs.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setLocalStream(null);
    setRemoteStreams({});
    setCallState('idle');
    setCurrentCall(null);
    setIsScreenSharing(false);
    setMicEnabled(true);
    setVideoEnabled(true);
    localStreamRef.current = null;
  };

  const createPeerConnection = (targetUserId: string, stream: MediaStream, isInitiator: boolean) => {
    if (pcs.current[targetUserId]) {
      pcs.current[targetUserId].close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcs.current[targetUserId] = pc;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { targetUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [targetUserId]: {
          ...prev[targetUserId],
          stream: event.streams[0]
        }
      }));
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[targetUserId];
          return next;
        });
        pc.close();
        delete pcs.current[targetUserId];
        
        // If 1:1 call ended because of disconnect
        if (!currentCall?.isMulti && Object.keys(pcs.current).length === 0) {
          cleanup();
        }
      }
    };

    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket?.emit('webrtc-offer', { targetUserId, sdp: pc.localDescription });
        })
        .catch(e => console.error(e));
    }

    return pc;
  };

  useEffect(() => {
    if (!socket || !user) return;

    const onIncomingCall = async (data: { callerId: string, callerName: string, video: boolean, audio: boolean }) => {
      if (callState !== 'idle') {
        socket.emit('reject-call', { targetUserId: data.callerId });
        return;
      }
      setCallState('ringing');
      setCurrentCall({ id: data.callerId, name: data.callerName, video: data.video, audio: data.audio });
    };

    const onCallAccepted = async (data: { answererId: string }) => {
      if (callState === 'connecting' || callState === 'calling') {
        setCallState('connected');
        if (localStreamRef.current) {
          createPeerConnection(data.answererId, localStreamRef.current, true);
        }
      }
    };

    const onCallRejected = () => {
      setError('Call was declined');
      cleanup();
    };

    const onCallEnded = (data: { senderId: string }) => {
      if (pcs.current[data.senderId]) {
        pcs.current[data.senderId].close();
        delete pcs.current[data.senderId];
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[data.senderId];
          return next;
        });
      }
      if (!currentCall?.isMulti) {
        cleanup();
      }
    };

    const onWebRTCOffer = async (data: { senderId: string, sdp: any }) => {
      if (!localStreamRef.current) return;
      setCallState('connected');
      const pc = createPeerConnection(data.senderId, localStreamRef.current, false);
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { targetUserId: data.senderId, sdp: pc.localDescription });
    };

    const onWebRTCAnswer = async (data: { senderId: string, sdp: any }) => {
      const pc = pcs.current[data.senderId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    };

    const onIceCandidate = async (data: { senderId: string, candidate: any }) => {
      const pc = pcs.current[data.senderId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.error(e));
      }
    };

    // Multi-User events
    const onUserJoinedCall = (data: { userId: string, userName: string }) => {
      if (localStreamRef.current && currentCall?.isMulti) {
        // Initiator creates peer connection and sends offer to the newcomer
        createPeerConnection(data.userId, localStreamRef.current, true);
        setRemoteStreams(prev => ({
          ...prev,
          [data.userId]: { ...prev[data.userId], name: data.userName, stream: new MediaStream() }
        }));
      }
    };

    const onUserLeftCall = (data: { userId: string }) => {
      if (pcs.current[data.userId]) {
        pcs.current[data.userId].close();
        delete pcs.current[data.userId];
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    };

    socket.on('incoming-call', onIncomingCall);
    socket.on('call-accepted', onCallAccepted);
    socket.on('call-rejected', onCallRejected);
    socket.on('call-ended', onCallEnded);
    socket.on('webrtc-offer', onWebRTCOffer);
    socket.on('webrtc-answer', onWebRTCAnswer);
    socket.on('ice-candidate', onIceCandidate);
    
    socket.on('user-joined-call', onUserJoinedCall);
    socket.on('user-left-call', onUserLeftCall);
    socket.on('call-error', (e) => setError(e.message));

    return () => {
      socket.off('incoming-call', onIncomingCall);
      socket.off('call-accepted', onCallAccepted);
      socket.off('call-rejected', onCallRejected);
      socket.off('call-ended', onCallEnded);
      socket.off('webrtc-offer', onWebRTCOffer);
      socket.off('webrtc-answer', onWebRTCAnswer);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('user-joined-call', onUserJoinedCall);
      socket.off('user-left-call', onUserLeftCall);
      socket.off('call-error');
    };
  }, [socket, callState, currentCall, user]);

  const startCall = async (targetUserId: string, targetName: string, video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setCallState('calling');
      setCurrentCall({ id: targetUserId, name: targetName, video, audio: true, isMulti: false });
      socket?.emit('call-user', { targetUserId, video, audio: true });
    } catch {
      setError('Could not access camera/microphone');
    }
  };

  const joinCall = async (channelId: string, channelName: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setCallState('connected');
      setCurrentCall({ id: channelId, name: channelName, video: true, audio: true, isMulti: true });
      socket?.emit('join-call', { channelId });
    } catch {
      setError('Could not access camera/microphone');
    }
  };

  const acceptCall = async () => {
    if (!currentCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: currentCall.video, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setCallState('connecting');
      socket?.emit('accept-call', { targetUserId: currentCall.id });
    } catch {
      setError('Could not access camera/microphone');
      socket?.emit('reject-call', { targetUserId: currentCall.id });
      cleanup();
    }
  };

  const rejectCall = () => {
    if (currentCall && !currentCall.isMulti) {
      socket?.emit('reject-call', { targetUserId: currentCall.id });
    }
    cleanup();
  };

  const endCall = () => {
    if (currentCall) {
      if (currentCall.isMulti) {
        socket?.emit('leave-call', { channelId: currentCall.id });
      } else {
        socket?.emit('end-call', { targetUserId: currentCall.id });
      }
    }
    cleanup();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micEnabled;
      });
      setMicEnabled(!micEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && !isScreenSharing) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!localStreamRef.current) return;

    if (isScreenSharing) {
      // Revert to webcam
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoEnabled, audio: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        Object.values(pcs.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
        
        localStreamRef.current.getVideoTracks()[0].stop();
        localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsScreenSharing(false);
      } catch (err) {
        console.error('Failed to revert to webcam', err);
      }
    } else {
      // Share screen
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          toggleScreenShare(); // revert when stopped via browser UI
        };
        
        Object.values(pcs.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        
        localStreamRef.current.getVideoTracks()[0].stop();
        localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
        localStreamRef.current.addTrack(screenTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Failed to share screen', err);
      }
    }
  };

  return (
    <CallContext.Provider value={{
      callState, currentCall, localStream, remoteStreams, error,
      startCall, joinCall, acceptCall, rejectCall, endCall,
      toggleMic, toggleVideo, toggleScreenShare,
      micEnabled, videoEnabled, isScreenSharing,
      clearError: () => setError(null)
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
