import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';

interface Props {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const WorkspaceSidebar: React.FC<Props> = ({ mobileOpen, onMobileClose }) => {
  const { workspaces, currentWorkspace, setCurrentWorkspace, setCurrentChannel } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className={`w-20 bg-slate-900 border-r border-slate-800 flex-col items-center py-4 gap-4 h-full overflow-y-auto shrink-0 z-40 ${mobileOpen ? 'flex absolute left-0 top-0 bottom-0' : 'hidden md:flex'}`}>
      {/* Home / Dashboard icon */}
      <div 
        className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:rounded-2xl ${!currentWorkspace ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-indigo-500/20 hover:text-indigo-400'}`}
        onClick={() => {
          setCurrentWorkspace(null);
          setCurrentChannel(null);
          if (onMobileClose) onMobileClose();
        }}
        title="Dashboard"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>

      <div className="w-10 h-0.5 bg-slate-800 rounded-full shrink-0" />

      {workspaces.map(ws => (
        <div 
          key={ws.id}
          className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center cursor-pointer font-bold text-lg transition-all ${currentWorkspace?.id === ws.id ? 'bg-white text-slate-900 shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:rounded-2xl'}`}
          onClick={() => {
            setCurrentWorkspace(ws);
            setCurrentChannel(null);
          }}
          title={ws.name}
        >
          {ws.name.charAt(0).toUpperCase()}
        </div>
      ))}

      <button 
        onClick={() => setShowCreate(true)}
        className="w-12 h-12 shrink-0 rounded-full border border-dashed border-slate-600 text-slate-400 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all mt-auto"
        title="Create Team"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
    </div>
  );
};

