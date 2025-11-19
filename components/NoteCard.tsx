import React, { useState, useEffect, useRef } from 'react';
import { Heart, Share2, MessageCircle, Music, Type, Moon, Coffee, Sun, Star, Play, Plane, Cpu, Newspaper, Feather, Mic, Zap, Globe, Camera, Palette, Code, Flame, Smile } from 'lucide-react';
import { Note, NoteType } from '../types';
import AudioPlayer from './AudioPlayer';

interface NoteCardProps {
  note: Note;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  onUserClick: (userId: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'Music': Music,
  'Type': Type,
  'Moon': Moon,
  'Coffee': Coffee,
  'Sun': Sun,
  'Star': Star,
  'Plane': Plane,
  'Cpu': Cpu,
  'Newspaper': Newspaper,
  'Feather': Feather,
  'Mic': Mic,
  'Zap': Zap,
  'Globe': Globe,
  'Camera': Camera,
  'Palette': Palette,
  'Code': Code,
  'Flame': Flame,
  'Smile': Smile
};

const NoteCard: React.FC<NoteCardProps> = ({ note, onLike, onComment, onUserClick }) => {
  const Icon = note.style.icon ? ICON_MAP[note.style.icon] : null;
  
  // Animation state to prevent initial pop on load
  const [isAnimating, setIsAnimating] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) {
        if (note.isLikedByCurrentUser) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 400); // Match animation duration
            return () => clearTimeout(timer);
        }
    } else {
        isMounted.current = true;
    }
  }, [note.isLikedByCurrentUser]);

  return (
    <div className={`relative w-full rounded-3xl p-6 mb-4 transition-all shadow-sm hover:shadow-md ${note.style.color} ${note.style.font} dark:border dark:border-white/10`}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onUserClick(note.userId)}
        >
          <img 
            src={note.author.avatarUrl} 
            alt={note.author.username} 
            className="w-10 h-10 rounded-full border-2 border-white dark:border-white/20 object-cover"
          />
          <div>
            <h3 className="text-sm font-bold leading-none dark:text-white">{note.author.displayName}</h3>
            <span className="text-xs opacity-60 dark:text-gray-300">@{note.author.username}</span>
          </div>
        </div>
        {Icon && <Icon className="opacity-20 dark:text-white" size={24} />}
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-lg leading-relaxed whitespace-pre-wrap dark:text-white/90">{note.content}</p>
      </div>

      {/* Audio Attachment */}
      {note.type === NoteType.AUDIO && note.audioDuration && (
        <div className="mb-4">
          <AudioPlayer 
            duration={note.audioDuration} 
            src={note.audioUrl} 
            colorClass={note.style.color.includes('text-white') || note.style.color.includes('dark') ? 'text-white' : 'text-gray-900 dark:text-white'}
          />
        </div>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {note.tags.map(tag => (
            <span key={tag} className="text-xs font-bold opacity-50 dark:text-white/70">{tag}</span>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onLike(note.id);
            }}
            className="flex items-center gap-1.5 text-sm font-medium transition-transform active:scale-90 group"
          >
            <Heart 
              size={20} 
              fill={note.isLikedByCurrentUser ? "currentColor" : "none"} 
              className={`transition-colors duration-300 ${
                  note.isLikedByCurrentUser 
                    ? 'text-red-500' 
                    : 'text-black/60 dark:text-white/60 group-hover:text-red-500'
                } ${isAnimating ? 'animate-heart-pop' : ''}`}
            />
            <span className="dark:text-white/80">{note.likes}</span>
          </button>

          <button 
            onClick={() => onComment(note.id)}
            className="flex items-center gap-1.5 text-sm font-medium opacity-60 hover:opacity-100 dark:text-white/60 dark:hover:text-white"
          >
            <MessageCircle size={20} />
            <span>{note.comments.length > 0 ? note.comments.length : ''}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 opacity-60 dark:text-white/60">
          <button><Share2 size={18} /></button>
        </div>
      </div>
    </div>
  );
};

export default NoteCard;