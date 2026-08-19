import React, { useState, useRef, useEffect } from 'react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  isMine: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ audioUrl, isMine }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && (!duration || isNaN(duration))) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = newProgress * duration;
    setCurrentTime(audio.currentTime);
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Waveform bars simulation
  const waveformHeights = [
    35, 55, 75, 45, 90, 60, 40, 80, 100, 70, 50, 85, 65, 40, 95, 75, 45, 60, 80, 50
  ];

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[210px] sm:min-w-[250px] max-w-full select-none">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* WhatsApp Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all transform active:scale-95 ${
          isMine
            ? 'bg-white text-indigo-600 hover:bg-slate-100'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
        title={isPlaying ? 'Pause' : 'Play Voice Message'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform & Scrubber Section */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        <div
          onClick={handleSeek}
          className="relative h-6 flex items-center gap-[3px] cursor-pointer py-1 group"
          title="Click to seek"
        >
          {waveformHeights.map((height, i) => {
            const barProgress = (i / waveformHeights.length) * 100;
            const isPlayed = progress >= barProgress;

            return (
              <div
                key={i}
                style={{ height: `${height}%` }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isMine
                    ? isPlayed
                      ? 'bg-white'
                      : 'bg-indigo-300/60 group-hover:bg-indigo-200'
                    : isPlayed
                    ? 'bg-indigo-600'
                    : 'bg-slate-300 group-hover:bg-slate-400'
                }`}
              />
            );
          })}
        </div>

        {/* Time and Speed Controls */}
        <div className="flex items-center justify-between text-[11px] font-medium leading-none">
          <span className={isMine ? 'text-indigo-100' : 'text-slate-500'}>
            {isPlaying ? formatTime(currentTime) : formatTime(duration || currentTime)}
          </span>

          <div className="flex items-center gap-1.5">
            {isPlaying && (
              <button
                type="button"
                onClick={toggleSpeed}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                  isMine
                    ? 'bg-indigo-700/60 hover:bg-indigo-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {playbackRate}x
              </button>
            )}

            {/* Mic Indicator Icon */}
            <span
              className={`inline-flex items-center justify-center ${
                isMine ? 'text-indigo-200' : 'text-indigo-600'
              }`}
              title="Voice Message"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
