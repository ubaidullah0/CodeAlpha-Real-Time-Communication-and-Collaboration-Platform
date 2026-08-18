import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'PUBLIC' | 'PRIVATE';
  workspaceId: string;
}

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  channels: Channel[];
  currentChannel: Channel | null;
  members: WorkspaceMember[];
  loading: boolean;
  error: string | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  refreshWorkspaces: () => void;
  refreshChannels: () => void;
  refreshMembers: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/workspaces', { withCredentials: true });
      setWorkspaces(res.data);
      if (res.data.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(res.data[0]);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    if (!currentWorkspace) {
      setChannels([]);
      setCurrentChannel(null);
      return;
    }
    try {
      const res = await axios.get(`/api/workspaces/${currentWorkspace.id}/channels`, { withCredentials: true });
      setChannels(res.data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchMembers = async () => {
    if (!currentWorkspace) {
      setMembers([]);
      return;
    }
    try {
      const res = await axios.get(`/api/workspaces/${currentWorkspace.id}/members`, { withCredentials: true });
      setMembers(res.data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    fetchChannels();
    fetchMembers();
  }, [currentWorkspace]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      channels,
      currentChannel,
      members,
      loading,
      error,
      setCurrentWorkspace,
      setCurrentChannel,
      refreshWorkspaces: fetchWorkspaces,
      refreshChannels: fetchChannels,
      refreshMembers: fetchMembers
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
