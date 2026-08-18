import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Whiteboard } from '../components/Whiteboard';
import { vi } from 'vitest';

// Mock SocketContext
vi.mock('../context/SocketContext', () => ({
  useSocket: () => ({
    socket: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    }
  })
}));

describe('Whiteboard', () => {
  it('renders whiteboard component', () => {
    render(<Whiteboard channelId="test-channel" />);
    expect(screen.getByText('🎨 Whiteboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
  });
});
