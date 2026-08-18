import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatWindow from '../components/ChatWindow';

// Mock contexts
const mockSocketEmit = vi.fn();
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();

vi.mock('../context/SocketContext', () => ({
  useSocket: () => ({
    socket: {
      emit: mockSocketEmit,
      on: mockSocketOn,
      off: mockSocketOff
    }
  })
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'User 1', email: 'u1@example.com' }
  })
}));

const mockTargetUser = { id: 'u2', name: 'User 2', email: 'u2@example.com' };

describe('ChatWindow Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default fetch mock (empty conversation)
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ messages: [] })
    }));
  });

  it('renders loading state and empty state correctly', async () => {
    render(<ChatWindow targetUser={mockTargetUser} onClose={vi.fn()} />);
    
    // Initially renders empty state after fetch resolves
    await waitFor(() => {
      expect(screen.getByText('No messages yet. Say hi!')).toBeInTheDocument();
    });
    
    // Title renders correctly
    expect(screen.getByText('Chat with User 2')).toBeInTheDocument();
  });

  it('fetches and displays message history', async () => {
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        messages: [
          { id: 'm1', content: 'Hello there', senderId: 'u2', receiverId: 'u1', createdAt: new Date().toISOString() },
          { id: 'm2', content: 'Hi', senderId: 'u1', receiverId: 'u2', createdAt: new Date().toISOString() }
        ]
      })
    }));

    render(<ChatWindow targetUser={mockTargetUser} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Hello there')).toBeInTheDocument();
      expect(screen.getByText('Hi')).toBeInTheDocument();
    });
  });

  it('sends message via socket when form is submitted', async () => {
    render(<ChatWindow targetUser={mockTargetUser} onClose={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('No messages yet. Say hi!')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: 'Send' });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(mockSocketEmit).toHaveBeenCalledWith('send-message', {
      receiverId: 'u2',
      content: 'Test message'
    });
  });

  it('prevents sending empty or whitespace-only messages', async () => {
    render(<ChatWindow targetUser={mockTargetUser} onClose={vi.fn()} />);
    
    await waitFor(() => screen.getByPlaceholderText('Type your message...'));

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: 'Send' });

    // Empty
    fireEvent.click(sendButton);
    expect(mockSocketEmit).not.toHaveBeenCalled();

    // Whitespace
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(sendButton);
    expect(mockSocketEmit).not.toHaveBeenCalled();
  });

  it('handles incoming real-time messages correctly', async () => {
    render(<ChatWindow targetUser={mockTargetUser} onClose={vi.fn()} />);
    
    await waitFor(() => screen.getByText('No messages yet. Say hi!'));

    // Extract the message-received handler
    const onCall = mockSocketOn.mock.calls.find(call => call[0] === 'message-received');
    if (!onCall) throw new Error('message-received handler not registered');
    
    const handleMessageReceived = onCall[1];

    // Simulate incoming message
    const newMessage = {
      id: 'm3',
      content: 'Socket message',
      senderId: 'u2',
      receiverId: 'u1',
      createdAt: new Date().toISOString()
    };

    // React `act` wrapper is needed for state updates
    act(() => {
      handleMessageReceived(newMessage);
    });

    await waitFor(() => {
      expect(screen.getByText('Socket message')).toBeInTheDocument();
    });
  });
});
