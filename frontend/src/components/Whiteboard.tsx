import React, { useRef, useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

interface WhiteboardProps {
  channelId: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ channelId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { socket } = useSocket();
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#4f46e5'); // Indigo 600 default
  const posRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!socket || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const resize = () => {
      // Create a temporary canvas to save drawing
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      
      // Restore drawing
      ctx.drawImage(tempCanvas, 0, 0);
    };

    // Initial sizing
    resize();
    window.addEventListener('resize', resize);

    const onDraw = (data: { x0: number, y0: number, x1: number, y1: number, color: string }) => {
      const w = canvas.width;
      const h = canvas.height;
      
      ctx.beginPath();
      ctx.moveTo(data.x0 * w, data.y0 * h);
      ctx.lineTo(data.x1 * w, data.y1 * h);
      ctx.strokeStyle = data.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.closePath();
    };

    const onClear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('whiteboard-draw', onDraw);
    socket.on('whiteboard-clear', onClear);

    return () => {
      window.removeEventListener('resize', resize);
      socket.off('whiteboard-draw', onDraw);
      socket.off('whiteboard-clear', onClear);
    };
  }, [socket]);

  const drawLine = (x0: number, y0: number, x1: number, y1: number, color: string, emit: boolean) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();

    if (!emit || !socket) return;
    
    const w = canvas.width;
    const h = canvas.height;

    socket.emit('whiteboard-draw', {
      channelId,
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color
    });
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    posRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const onMouseUp = () => {
    setDrawing(false);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x1 = e.clientX - rect.left;
    const y1 = e.clientY - rect.top;
    
    drawLine(posRef.current.x, posRef.current.y, x1, y1, color, true);
    
    posRef.current = { x: x1, y: y1 };
  };
  
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    socket?.emit('whiteboard-clear', { channelId });
  };

  const colors = ['#0f172a', '#dc2626', '#16a34a', '#2563eb', '#4f46e5', '#d946ef'];

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          🎨 Whiteboard
        </h3>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-110'} transition-transform`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          
          <div className="w-px h-6 bg-slate-200"></div>
          
          <button
            onClick={handleClear}
            className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear
          </button>
        </div>
      </div>
      
      {/* Canvas Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-50/30 cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseOut={onMouseUp}
          onMouseMove={onMouseMove}
          className="absolute inset-0 touch-none"
        />
      </div>
    </div>
  );
};
