import React, { useEffect, useRef } from 'react';
import { useCall } from '../context/CallContext';

const RemoteVideo: React.FC<{ stream: MediaStream, name?: string }> = ({ stream, name }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <div className="relative bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-700 h-full w-full aspect-video">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      {name && (
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-white text-sm font-medium">{name}</span>
        </div>
      )}
    </div>
  );
};

const CallModal: React.FC = () => {
  const {
    callState, currentCall, localStream, remoteStreams,
    acceptCall, rejectCall, endCall, toggleMic, toggleVideo, toggleScreenShare,
    micEnabled, videoEnabled, isScreenSharing
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (callState === 'idle') return null;

  const remotePeers = Object.values(remoteStreams).filter(peer => peer.stream && peer.stream.active);
  const totalParticipants = remotePeers.length + 1;

  // Compute grid columns based on participants
  const gridCols = totalParticipants === 1 ? 'grid-cols-1' :
                   totalParticipants === 2 ? 'grid-cols-1 md:grid-cols-2' :
                   totalParticipants <= 4 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      {callState === 'ringing' ? (
        <div className="bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center border border-slate-800 shadow-2xl">
          <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-2xl text-white font-bold">{currentCall?.name?.charAt(0)}</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{currentCall?.name}</h2>
          <p className="text-slate-400 mb-8">{currentCall?.video ? 'Incoming video call' : 'Incoming voice call'}</p>
          <div className="flex justify-center gap-6">
            <button
              onClick={rejectCall}
              className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg shadow-red-500/20"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={acceptCall}
              className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg shadow-green-500/20"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl h-full max-h-[90vh] flex flex-col gap-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xl font-bold text-white">
              {currentCall?.isMulti ? `${currentCall.name} (Meeting Room)` : currentCall?.name}
            </h2>
            <div className="text-slate-400 font-medium">
              {callState === 'calling' ? 'Calling...' : 
               callState === 'connecting' ? 'Connecting...' : 
               `${totalParticipants} Participant${totalParticipants !== 1 ? 's' : ''}`}
            </div>
          </div>

          <div className={`flex-1 grid ${gridCols} gap-4 min-h-0`}>
            {/* Local Video */}
            <div className="relative bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-700 h-full w-full aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isScreenSharing ? 'scale-x-[-1]' : ''}`}
              />
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-white text-sm font-medium">You {isScreenSharing && '(Sharing Screen)'}</span>
              </div>
              {(!micEnabled || !videoEnabled) && (
                <div className="absolute top-4 right-4 flex gap-2">
                  {!micEnabled && (
                    <div className="bg-red-500/80 backdrop-blur-md p-2 rounded-lg">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                  )}
                  {!videoEnabled && (
                    <div className="bg-red-500/80 backdrop-blur-md p-2 rounded-lg">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {remotePeers.map((peer, idx) => (
              <RemoteVideo key={idx} stream={peer.stream} name={peer.name} />
            ))}
          </div>

          <div className="flex justify-center gap-4 py-4">
            <button
              onClick={toggleMic}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                micEnabled ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {micEnabled ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                )}
              </svg>
            </button>
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                videoEnabled ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={toggleScreenShare}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isScreenSharing ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title="Share Screen"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={endCall}
              className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg shadow-red-500/20 ml-4"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 14.08V19a2 2 0 002 2h14a2 2 0 002-2v-4.08A20.09 20.09 0 0112 11c-2.5 0-4.84.45-7 1.28z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallModal;
