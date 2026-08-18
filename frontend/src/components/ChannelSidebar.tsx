import React, { useState } from 'react';
import axios from 'axios';
import { useWorkspace } from '../context/WorkspaceContext';
import { CreateChannelModal } from './CreateChannelModal';
import { TeamMembersModal } from './TeamMembersModal';

interface Props {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const ChannelSidebar: React.FC<Props> = ({ mobileOpen, onMobileClose }) => {
  const { currentWorkspace, channels, currentChannel, setCurrentChannel, refreshWorkspaces, setCurrentWorkspace, refreshChannels } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace || !window.confirm(`Are you sure you want to delete the Team "${currentWorkspace.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/workspaces/${currentWorkspace.id}`, { withCredentials: true });
      await refreshWorkspaces();
      setCurrentWorkspace(null);
      setCurrentChannel(null);
      if (onMobileClose) onMobileClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete Team');
    }
  };

  const handleDeleteChannel = async (e: React.MouseEvent, channelId: string, channelName: string) => {
    e.stopPropagation();
    if (!currentWorkspace || !window.confirm(`Are you sure you want to delete the Channel "${channelName}"?`)) return;
    try {
      await axios.delete(`/api/channels/${channelId}`, { withCredentials: true });
      await refreshChannels(); // Refresh channels list
      if (currentChannel?.id === channelId) setCurrentChannel(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete Channel');
    }
  };

  if (!currentWorkspace) return null;

  return (
    <div className={`w-64 bg-slate-50 border-r border-slate-200 flex-col h-full shrink-0 z-30 ${mobileOpen ? 'flex absolute left-20 top-0 bottom-0 shadow-xl' : 'hidden md:flex'}`}>
      <div className="p-4 border-b border-slate-200 shadow-sm flex justify-between items-center bg-slate-100/50">
        <h2 className="font-extrabold text-slate-800 text-lg truncate pr-2" title={currentWorkspace.name}>
          {currentWorkspace.name}
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleDeleteWorkspace} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors" title="Delete Team">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          {mobileOpen && (
            <button onClick={onMobileClose} className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Members</span>
          <button 
            onClick={() => setShowMembers(true)}
            className="text-slate-400 hover:text-indigo-600 transition-colors bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded p-0.5 shadow-sm"
            title="Manage Team Members"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        </div>

        <div className="px-4 mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Channels</span>
          <button 
            onClick={() => setShowCreate(true)}
            className="text-slate-400 hover:text-indigo-600 transition-colors bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded p-0.5 shadow-sm"
            title="Create Channel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <ul className="space-y-0.5 px-2">
          {channels.map(channel => (
            <li key={channel.id} className="group relative">
              <button
                onClick={() => {
                  setCurrentChannel(channel);
                  if (onMobileClose) onMobileClose();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentChannel?.id === channel.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
              >
                {channel.type === 'PRIVATE' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <span className="text-lg leading-none opacity-70 shrink-0">#</span>
                )}
                <span className="truncate pr-6">{channel.name}</span>
              </button>
              <button 
                onClick={(e) => handleDeleteChannel(e, channel.id, channel.name)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 hover:bg-rose-50 rounded"
                title="Delete Channel"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </li>
          ))}
          {channels.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-slate-400 bg-slate-100/50 rounded-lg mx-2 border border-dashed border-slate-200 mt-2">
              No channels yet
            </li>
          )}
        </ul>
      </div>

      {showCreate && <CreateChannelModal onClose={() => setShowCreate(false)} />}
      {showMembers && <TeamMembersModal onClose={() => setShowMembers(false)} />}
    </div>
  );
};

