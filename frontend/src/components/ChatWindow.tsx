import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth, User } from '../context/AuthContext';
import { useCall } from '../context/CallContext';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  read?: boolean;
  createdAt: string;
}

interface ChatWindowProps {
  targetUser: User;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ targetUser, onClose }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { startCall } = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async (cursor?: string) => {
    try {
      const url = `/api/messages/${targetUser.id}?limit=50${cursor ? `&before=${cursor}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await res.json();
      const newMessages = data.messages as Message[];
      
      setMessages(prev => {
        if (!cursor) return newMessages.reverse(); // initial load
        // merge and deduplicate
        const merged = [...newMessages.reverse(), ...prev];
        const unique = Array.from(new Map(merged.map(m => [m.id, m])).values());
        return unique.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });
      
      setHasMore(newMessages.length === 50); // limit is 50
    } catch (err) {
      console.error(err);
      setError('Could not load messages');
    } finally {
      setLoading(false);
    }
  }, [targetUser.id]);

  useEffect(() => {
    // Initial fetch
    setMessages([]);
    setLoading(true);
    setError(null);
    setHasMore(true);
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (message: Message) => {
      // Is this message related to the currently selected conversation?
      if (
        (message.senderId === targetUser.id && message.receiverId === user?.id) ||
        (message.senderId === user?.id && message.receiverId === targetUser.id)
      ) {
        setMessages(prev => {
          if (!prev.find(m => m.id === message.id)) {
            return [...prev, message];
          }
          return prev;
        });
        
        // If the other user sent it and we are looking at this chat, mark as seen
        if (message.senderId === targetUser.id) {
          socket.emit('mark-messages-seen', { senderId: targetUser.id });
        }
        
        // Auto scroll on new message if at bottom (simplified: just scroll)
        setTimeout(() => {
          if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 50);
      }
    };

    const handleMessageError = (errData: { message: string }) => {
      setError(errData.message);
      setSending(false);
    };

    socket.on('message-received', handleMessageReceived);
    socket.on('message-error', handleMessageError);
    socket.on('message-deleted', (data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    });
    socket.on('messages-seen', (data: { readerId: string }) => {
      if (data.readerId === targetUser.id) {
        setMessages(prev => prev.map(m => m.senderId === user?.id ? { ...m, read: true } : m));
      }
    });

    return () => {
      socket.off('message-received', handleMessageReceived);
      socket.off('message-error', handleMessageError);
      socket.off('message-deleted');
      socket.off('messages-seen');
    };
  }, [socket, targetUser.id, user?.id]);

  useEffect(() => {
    if (socket && targetUser.id) {
      socket.emit('mark-messages-seen', { senderId: targetUser.id });
    }
  }, [socket, targetUser.id]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView();
      }
    }
  }, [loading, messages.length]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      
      socket?.emit('send-message', {
        receiverId: targetUser.id,
        content: '',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType
      });
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([audioBlob], `"voice-message.${ext}`", { type: mimeType });
        await uploadVoiceMessage(file);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied or error occurred');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const uploadVoiceMessage = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      
      socket?.emit('send-message', {
        receiverId: targetUser.id,
        content: '🎤 Voice Message',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType
      });
    } catch (err) {
      setError('Failed to send voice message');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !input.trim()) return;

    setSending(true);
    setError(null);
    socket.emit('send-message', {
      receiverId: targetUser.id,
      content: input.trim()
    });
    setInput('');
    setTimeout(() => setSending(false), 500); 
  };

  const handleLoadMore = () => {
    if (messages.length > 0) {
      fetchMessages(messages[0].id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="md:hidden p-1 mr-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h3 className="font-semibold text-gray-800">Chat with {targetUser.name}</h3>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => startCall(targetUser.id, targetUser.name, false)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors" title="Audio Call">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </button>
          <button onClick={() => startCall(targetUser.id, targetUser.name, true)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors" title="Video Call">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          <button onClick={onClose} className="hidden md:block p-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-200 transition-colors" title="Close Chat">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50"
      >
        {loading && messages.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-4">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-4">No messages yet. Say hi!</div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center">
                <button 
                  onClick={handleLoadMore}
                  className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200"
                >
                  Load older messages
                </button>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isMine = msg.senderId === user?.id;
              const showHeader = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
              
              return (
                <div key={msg.id} className={`group flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {showHeader && (
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="font-semibold text-sm text-slate-700">
                        {isMine ? 'You' : targetUser.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-end gap-2 max-w-[85%]">
                    {isMine && (
                      <button 
                        onClick={() => socket?.emit('delete-message', { messageId: msg.id, receiverId: targetUser.id })}
                        className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Delete Message"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                    <div 
                      className={`px-4 py-2.5 rounded-2xl text-sm min-w-0 ${
                        isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-sm'
                      }`}
                    >
                      {msg.fileUrl && (
                        <div className="mb-2">
                          {msg.fileType?.startsWith('audio/') ? (
                            <audio controls src={`${msg.fileUrl}`} className="max-w-[240px] h-10" />
                          ) : msg.fileType?.startsWith('image/') ? (
                            <img 
                              src={`${msg.fileUrl}`} 
                              alt={msg.fileName} 
                              className="max-w-xs rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity" 
                              onClick={() => setSelectedImage(`${msg.fileUrl}`)}
                            />
                          ) : (
                            <a href={`${msg.fileUrl}`} target="_blank" rel="noreferrer" className="underline text-indigo-200 break-all">
                              {msg.fileName}
                            </a>
                          )}
                        </div>
                      )}
                      <div className="flex items-end gap-3 justify-between">
                        <p className="break-words">{msg.content}</p>
                        {isMine && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${msg.read ? 'text-indigo-200' : 'text-indigo-400/70'}`}>
                            {msg.read ? 'Seen' : 'Sent'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {error && (
        <div className="px-4 py-2 bg-rose-50 text-rose-600 text-sm border-t border-rose-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2 sm:gap-3 items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isRecording}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          </button>
          
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={uploading}
            title={isRecording ? "Stop Recording" : "Send Voice Message"}
            className={`p-2 rounded-full transition-colors ${isRecording ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 animate-pulse' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isRecording ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 9h6v6H9V9z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              )}
            </svg>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={isRecording ? "flex-1 min-w-0 px-3 md:px-4 py-2 md:py-3 bg-rose-50 text-rose-600 font-medium border border-rose-200 rounded-xl focus:outline-none transition-all placeholder-rose-400" : "flex-1 min-w-0 px-3 md:px-4 py-2 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"}
            placeholder={isRecording ? "🔴 Recording voice message..." : "Type your message..."}
            disabled={sending || uploading || isRecording}
          />
          <button
            type="submit"
            disabled={(!input.trim() && !uploading) || sending || isRecording}
            className="shrink-0 px-3 md:px-6 py-2 md:py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200 flex items-center justify-center"
          >
            {sending || uploading ? '...' : 'Send'}
          </button>
        </div>
      </form>

        {/* Image Lightbox Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-5xl w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-4 right-4 flex gap-3">
                <a 
                  href={selectedImage} 
                  download 
                  target="_blank"
                  className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors"
                  title="Download Image"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
                <button 
                  className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors"
                  onClick={() => setSelectedImage(null)}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <img 
                src={selectedImage} 
                alt="Fullscreen view" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        )}
    </div>
  );
};

export default ChatWindow;
