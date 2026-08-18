import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WorkspaceSidebar } from '../components/WorkspaceSidebar';
import { ChannelSidebar } from '../components/ChannelSidebar';


// Mock WorkspaceContext
const mockSetCurrentWorkspace = vi.fn();
const mockSetCurrentChannel = vi.fn();

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    workspaces: [{ id: 'w1', name: 'Test Workspace', ownerId: 'u1', createdAt: '' }],
    currentWorkspace: { id: 'w1', name: 'Test Workspace' },
    channels: [{ id: 'c1', name: 'general', type: 'PUBLIC', workspaceId: 'w1' }],
    currentChannel: null,
    setCurrentWorkspace: mockSetCurrentWorkspace,
    setCurrentChannel: mockSetCurrentChannel,
  }),
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('Workspace and Channel Sidebars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders workspaces and handles selection', () => {
    render(<WorkspaceSidebar />);
    expect(screen.getByTitle('Test Workspace')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Test Workspace'));
    expect(mockSetCurrentWorkspace).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }));
    expect(mockSetCurrentChannel).toHaveBeenCalledWith(null);
  });

  it('renders channels and handles selection', () => {
    render(<ChannelSidebar />);
    expect(screen.getByText('general')).toBeInTheDocument();
    fireEvent.click(screen.getByText('general'));
    expect(mockSetCurrentChannel).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });
});

