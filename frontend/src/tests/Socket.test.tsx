import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as socketIoClient from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const on = vi.fn();
  const off = vi.fn();
  const emit = vi.fn();
  const disconnect = vi.fn();
  
  return {
    io: vi.fn(() => ({
      on,
      off,
      emit,
      disconnect,
    })),
    Socket: vi.fn()
  };
});

describe('Frontend Socket.io Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not connect socket when logged out', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Authentication required' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'success' }),
      });
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    });

    expect(socketIoClient.io).not.toHaveBeenCalled();
  });

  it('connects socket when authenticated user exists', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: '1', name: 'Test User', email: 'test@example.com' } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'success', backend: 'Connected', database: 'Connected' }),
      });
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Your Profile/i)).toBeInTheDocument();
    });

    expect(socketIoClient.io).toHaveBeenCalledWith('/', expect.objectContaining({
      withCredentials: true
    }));
  });
});
