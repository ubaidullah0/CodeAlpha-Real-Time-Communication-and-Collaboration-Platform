import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

export const TeamMembersModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, [currentWorkspace]);

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`/api/workspaces/${currentWorkspace?.id}/members`, { withCredentials: true });
      setMembers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError('Email is required');
    try {
      setLoading(true);
      setError('');
      await axios.post(`/api/workspaces/${currentWorkspace?.id}/members`, { email: email.trim() }, { withCredentials: true });
      setEmail('');
      await fetchMembers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await axios.delete(`/api/workspaces/${currentWorkspace?.id}/members/${userId}`, { withCredentials: true });
      await fetchMembers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const isOwnerOrAdmin = members.find(m => m.id === user?.id)?.role !== 'MEMBER';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h2 className="text-xl font-bold text-slate-800">Team Members</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100 font-medium">{error}</div>}
          
          {isOwnerOrAdmin && (
            <form onSubmit={handleAdd} className="mb-6 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white text-sm"
                placeholder="User Email Address"
              />
              <button type="submit" disabled={loading} className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm">
                {loading ? '...' : 'Add'}
              </button>
            </form>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Members ({members.length})</h3>
            {fetching ? (
              <div className="text-sm text-slate-400">Loading...</div>
            ) : (
              members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{m.name} {m.id === user?.id && '(You)'}</p>
                    <p className="text-xs text-slate-500">{m.email} &bull; {m.role}</p>
                  </div>
                  {isOwnerOrAdmin && m.id !== user?.id && (
                    <button onClick={() => handleRemove(m.id)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors" title="Remove Member">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
