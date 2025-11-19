import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  duration: number; // In seconds
  src?: string; // In a real app, the audio source
  colorClass?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ duration, src, colorClass = 'text-gray-800' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<any>(null);

  // Generate random bar heights for waveform visualization
  const [bars] = useState(() => Array.from({ length: 20 }, () => Math.floor(Math.random() * 16) + 4));

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, duration]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`flex items-center gap-3 p-2 rounded-full bg-black/5 backdrop-blur-sm max-w-fit ${colorClass}`}>
      <button 
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm active:scale-95 transition-transform"
      >
        {isPlaying ? <Pause size={14} className="text-black" /> : <Play size={14} className="text-black ml-0.5" />}
      </button>

      <div className="flex items-center gap-0.5 h-6">
        {bars.map((height, i) => {
          const active = (i / bars.length) * duration < progress;
          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-300 ${active ? 'bg-black/70' : 'bg-black/20'}`}
              style={{ 
                height: isPlaying ? `${Math.max(4, height + Math.sin(Date.now() / 200 + i) * 5)}px` : `${height}px` 
              }}
            />
          );
        })}
      </div>

      <span className="text-xs font-mono opacity-60 min-w-[32px]">
        {formatTime(isPlaying ? progress : duration)}
      </span>
    </div>
  );
};

export default AudioPlayer;