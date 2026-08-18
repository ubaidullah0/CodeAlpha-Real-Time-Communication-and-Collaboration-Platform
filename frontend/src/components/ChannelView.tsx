import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Channel } from '../context/WorkspaceContext';
import { Whiteboard } from './Whiteboard';
import { useCall } from '../context/CallContext';

interface ChannelMessage {
  id: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  senderId: string;
  channelId: string;
  createdAt: string;
  sender?: { name: string; email: string };
}

export const ChannelView: React.FC<{ channel: Channel }> = ({ channel }) => {
  const { user } = useAuth();
  const { socket, joinChannel, leaveChannel } = useSocket();
  const { joinCall } = useCall();
  
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard'>('chat');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset state when channel changes
    setMessages([]);
    setCursor(undefined);
    setHasMore(true);
    
    // Join socket room
    joinChannel(channel.id);
    loadMessages();

    return () => {
      leaveChannel(channel.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message: ChannelMessage) => {
      if (message.channelId === channel.id) {
        setMessages(prev => {
          // Deduplicate
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    const handleMessageDelete = (data: { messageId: string, channelId: string }) => {
      if (data.channelId === channel.id) {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      }
    };

    socket.on('channel-message-received', handleMessage);
    socket.on('channel-message-deleted', handleMessageDelete);
    return () => {
      socket.off('channel-message-received', handleMessage);
      socket.off('channel-message-deleted', handleMessageDelete);
    };
  }, [socket, channel.id]);

  const loadMessages = async (currentCursor?: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/channels/${channel.id}/messages`, {
        params: { cursor: currentCursor, limit: 50 },
        withCredentials: true
      });
      
      const newMessages = res.data.messages;
      setHasMore(res.data.hasMore);
      
      if (newMessages.length > 0) {
        setCursor(newMessages[0].id); // Oldest message id
      }

      setMessages(prev => {
        // Deduplicate logic
        const existingIds = new Set(prev.map(m => m.id));
        const filteredNew = newMessages.filter((m: ChannelMessage) => !existingIds.has(m.id));
        return [...filteredNew, ...prev]; // Prepend older messages
      });
      
      if (!currentCursor) {
        // First load, scroll to bottom
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !loading) {
      loadMessages(cursor);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      
      socket?.emit('channel-message-send', {
        channelId: channel.id,
        content: '',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType
      });
    } catch (err) {
      console.error('Failed to upload file');
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
        await uploadVoiceMessage(file);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied or error occurred');
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
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      
      socket?.emit('channel-message-send', {
        channelId: channel.id,
        content: '🎤 Voice Message',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType
      });
    } catch (err) {
      console.error('Failed to send voice message');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    socket?.emit('channel-message-send', { channelId: channel.id, content: inputText.trim() });
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-slate-400">{channel.type === 'PRIVATE' ? '🔒' : '#'}</span>
          {channel.name}
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => joinCall(channel.id, channel.name)}
            className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
            title="Join Voice Channel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          
          <div className="flex bg-slate-200/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'chat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('whiteboard')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'whiteboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              Whiteboard
            </button>
          </div>
        </div>
      </div>
      
      {activeTab === 'chat' ? (
        <>
          <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {loading && <div className="text-center text-slate-400 text-sm py-2 bg-slate-100 rounded-lg shadow-inner">Loading messages...</div>}
            
            {messages.map((msg, idx) => {
              const isMe = msg.senderId === user?.id;
              const showHeader = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

              return (
                <div key={msg.id} className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showHeader && (
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="text-xs font-semibold text-slate-600">
                        {isMe ? 'You' : msg.sender?.name || 'Unknown User'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-end gap-2 max-w-[85%]">
                    {isMe && (
                      <button 
                        onClick={() => socket?.emit('channel-message-delete', { channelId: channel.id, messageId: msg.id })}
                        className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Delete Message"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                    <div 
                      className={`px-4 py-2.5 rounded-2xl text-sm min-w-0 ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-sm'}`}
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
                      {msg.content && <p className="break-words">{msg.content}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2 sm:gap-3 items-center">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || isRecording} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
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
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 min-w-0 px-3 md:px-4 py-2 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder={isRecording ? "Recording audio..." : `Message ${channel.type === 'PRIVATE' ? '' : '#'}${channel.name}`}
                disabled={uploading || isRecording}
              />
              <button 
                type="submit" 
                disabled={(!inputText.trim() && !uploading) || isRecording}
                className="shrink-0 px-3 md:px-6 py-2 md:py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200 flex items-center justify-center"
              >
                {uploading ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </>
      ) : (
        <Whiteboard channelId={channel.id} />
      )}

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
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
