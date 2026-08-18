import { render, screen, act } from '@testing-library/react';
import { CallProvider, useCall } from '../context/CallContext';

import { vi, describe, it, expect } from 'vitest';

// Mock WebRTC APIs
Object.defineProperty(window, 'RTCPeerConnection', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    close: vi.fn(),
    addTrack: vi.fn(),
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'fake-offer' }),
    createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'fake-answer' }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
  })),
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn(), enabled: true, kind: 'audio' }, { stop: vi.fn(), enabled: true, kind: 'video' }],
      getAudioTracks: () => [{ stop: vi.fn(), enabled: true }],
      getVideoTracks: () => [{ stop: vi.fn(), enabled: true }],
    }),
  },
});

global.MediaStream = vi.fn().mockImplementation(() => ({
  getTracks: () => [],
  addTrack: vi.fn(),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
})) as any;

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user123', name: 'Test User' } })
}));

vi.mock('../context/SocketContext', () => ({
  useSocket: () => ({ socket: mockSocket, connected: true, onlineUsers: [] }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SocketProvider: ({ children }: any) => <div>{children}</div>,
}));

const TestComponent = () => {
  const { callState, startCall, acceptCall, rejectCall, endCall } = useCall();
  return (
    <div>
      <div data-testid="call-state">{callState}</div>
      <button onClick={() => startCall('user2', 'Test User')}>Start Call</button>
      <button onClick={acceptCall}>Accept Call</button>
      <button onClick={rejectCall}>Reject Call</button>
      <button onClick={endCall}>End Call</button>
    </div>
  );
};

describe('CallContext', () => {
  it('initializes with idle state', () => {
    render(
      <CallProvider>
        <TestComponent />
      </CallProvider>
    );
    expect(screen.getByTestId('call-state').textContent).toBe('idle');
  });

  it('transitions to calling when startCall is invoked', async () => {
    render(
      <CallProvider>
        <TestComponent />
      </CallProvider>
    );

    await act(async () => {
      screen.getByText('Start Call').click();
    });
    
    // Wait for the async getUserMedia to resolve
    expect(screen.getByTestId('call-state').textContent).toBe('calling');
  });
});
