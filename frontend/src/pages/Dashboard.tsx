import React, { useEffect, useState } from 'react';
import { useAuth, User } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';
import { WorkspaceSidebar } from '../components/WorkspaceSidebar';
import { ChannelSidebar } from '../components/ChannelSidebar';
import { ChannelView } from '../components/ChannelView';

interface HealthResponse {
  status: string;
  backend: string;
  database: string;
}

const Dashboard: React.FC = () => {
  const { user, setUser } = useAuth();
  const { connected, onlineUsers } = useSocket();
  const { startCall } = useCall();
  const { currentWorkspace, currentChannel } = useWorkspace();
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <nav className="bg-white/90 backdrop-blur-md z-50 border-b border-slate-200 px-4 md:px-8 py-3 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white font-bold text-xl">
            S
          </div>
          <h1 className="text-lg md:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight truncate max-w-[200px] sm:max-w-md md:max-w-none">
            Communication Platform
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'}`}></div>
            <span className="text-xs font-bold text-slate-600">{connected ? 'Connected' : 'Reconnecting...'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white text-rose-600 font-bold text-sm rounded-xl border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm"
          >
            Log Out
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        <WorkspaceSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        <ChannelSidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        
        {mobileMenuOpen && (
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${currentWorkspace ? 'bg-white' : 'bg-slate-50'}`}>
          {currentChannel ? (
            <ChannelView channel={currentChannel} />
          ) : selectedUser ? (
            <div className="h-full">
              <ChatWindow targetUser={selectedUser} onClose={() => setSelectedUser(null)} />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 hover:shadow-md transition-shadow">
                  <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Your Profile
                  </h2>
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Name</p>
                      <p className="font-medium text-slate-800">{user?.name}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 break-words">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                      <p className="font-medium text-slate-800 text-sm">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 hover:shadow-md transition-shadow">
                  <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    System Status
                  </h2>
                  <div className="space-y-2">
                    {[
                      { label: 'Frontend', status: 'Connected', isUp: true },
                      { label: 'Backend', status: health?.backend || 'Checking...', isUp: health?.backend === 'Connected' },
                      { label: 'Database', status: health?.database || 'Checking...', isUp: health?.database === 'Connected' },
                      { label: 'Socket.io', status: connected ? 'Connected' : 'Disconnected', isUp: connected },
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100">
                        <span className="text-sm font-medium text-slate-600">{item.label}</span>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${item.isUp ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 min-h-[400px] h-full">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Directory
                    </h2>
                    <span className="bg-indigo-50 text-indigo-700 py-1 px-4 rounded-full text-sm font-bold border border-indigo-100 shadow-sm">
                      {onlineUsers.length} Online
                    </span>
                  </div>
                  {onlineUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p>No users are online right now.</p>
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {onlineUsers.map(u => (
                        <li 
                          key={u.id} 
                          onClick={() => {
                            if (u.id !== user?.id) {
                              setSelectedUser(u);
                            }
                          }}
                          className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                            u.id === user?.id 
                              ? 'bg-slate-50 border-slate-100' 
                              : 'bg-white hover:bg-indigo-50 cursor-pointer border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-inner">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{u.name}</span>
                            <span className="text-xs text-slate-500">{u.id === user?.id ? 'Active now (You)' : 'Active now'}</span>
                          </div>
                          {u.id !== user?.id && (
                            <div className="ml-auto flex gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); startCall(u.id, u.name, true); }}
                                className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors"
                                title="Video Call"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
