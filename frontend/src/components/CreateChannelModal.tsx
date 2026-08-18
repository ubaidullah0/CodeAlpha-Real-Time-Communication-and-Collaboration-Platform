import React, { useState } from 'react';
import axios from 'axios';
import { useWorkspace } from '../context/WorkspaceContext';

import { createPortal } from 'react-dom';

export const CreateChannelModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentWorkspace, refreshChannels } = useWorkspace();

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setError('');
      await axios.post(`/api/workspaces/${currentWorkspace.id}/channels`, { name: name.trim(), type }, { withCredentials: true });
      await refreshChannels();
      onClose();
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(err.response?.data?.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Create Channel</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Channel Name</label>
              <input type="text" autoFocus value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="e.g. general" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Channel Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="PUBLIC" checked={type === 'PUBLIC'} onChange={() => setType('PUBLIC')} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-slate-700">Public</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="PRIVATE" checked={type === 'PRIVATE'} onChange={() => setType('PRIVATE')} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-slate-700">Private</span>
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {type === 'PUBLIC' ? 'Anyone in the workspace can view and join this channel.' : 'Only invited members can view and join this channel.'}
              </p>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm shadow-indigo-200">
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
