
import React, { useState } from 'react';
import { X, ArrowRight, Heart, CornerDownRight, ArrowDownUp } from 'lucide-react';
import { Note, Comment, User } from '../types';

interface CommentsModalProps {
  note: Note;
  currentUser: User;
  users: User[];
  onClose: () => void;
  onSubmitComment: (text: string, parentId?: string) => void;
  onLikeComment: (commentId: string) => void;
  t: any;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ note, currentUser, users, onClose, onSubmitComment, onLikeComment, t }) => {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, username: string } | null>(null);
  const [sortBy, setSortBy] = useState<'LIKES' | 'NEWEST'>('LIKES');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmitComment(text, replyTo?.id);
    setText('');
    setReplyTo(null);
  };

  const handleReplyClick = (comment: Comment) => {
      const author = users.find(u => u.id === comment.userId);
      if (author) {
          setReplyTo({ id: comment.id, username: author.displayName });
      }
  };

  const CommentItem: React.FC<{ comment: Comment, depth?: number }> = ({ comment, depth = 0 }) => {
    const author = users.find(u => u.id === comment.userId);
    const isLiked = comment.isLikedByCurrentUser;
    const replies = note.comments.filter(c => c.parentId === comment.id).sort((a,b) => a.timestamp - b.timestamp);

    return (
      <div className={`flex flex-col ${depth > 0 ? 'ml-8 border-l-2 border-gray-100 dark:border-zinc-800 pl-3' : ''}`}>
        <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-xl mb-2">
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-2">
                 {author && <img src={author.avatarUrl} className="w-6 h-6 rounded-full object-cover" alt={author.username} />}
                 <p className="text-sm font-bold dark:text-white cursor-default">{author?.displayName || 'Unknown'}</p>
             </div>
             <button onClick={() => onLikeComment(comment.id)} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Heart size={12} fill={isLiked ? "currentColor" : "none"} className={isLiked ? 'text-red-500' : ''} />
                {(comment.likes || 0) > 0 && <span>{comment.likes}</span>}
             </button>
          </div>
          <p className="text-sm dark:text-gray-300 mt-1 leading-snug ml-8">{comment.text}</p>
          <div className="mt-2 flex gap-4 ml-8">
              <button onClick={() => handleReplyClick(comment)} className="text-xs font-bold text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                  {t.reply}
              </button>
          </div>
        </div>
        {replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    );
  };

  // Sort root comments
  const rootComments = note.comments
    .filter(c => !c.parentId)
    .sort((a, b) => {
        if (sortBy === 'LIKES') {
            const diff = (b.likes || 0) - (a.likes || 0);
            if (diff !== 0) return diff;
        }
        return b.timestamp - a.timestamp;
    });

  const isAr = t.comments === 'تعليقات';

  return (
    <div className="absolute inset-0 bg-black/50 z-[60] flex items-end backdrop-blur-sm" onClick={onClose}>
        <div 
            className="bg-white dark:bg-zinc-900 w-full rounded-t-3xl p-6 animate-slide-up shadow-2xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2 shrink-0">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold dark:text-white">{t.comments} ({note.comments.length})</h3>
                    {note.comments.length > 1 && (
                        <button 
                            onClick={() => setSortBy(prev => prev === 'LIKES' ? 'NEWEST' : 'LIKES')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <ArrowDownUp size={12} className="text-gray-500 dark:text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {sortBy === 'LIKES' 
                                    ? (isAr ? 'الأفضل' : 'Top') 
                                    : (isAr ? 'الأحدث' : 'Newest')}
                            </span>
                        </button>
                    )}
                </div>
                <button onClick={onClose}><X size={20} className="dark:text-white"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4 space-y-3 no-scrollbar">
                {rootComments.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-8">
                       {isAr ? 'لا توجد تعليقات بعد.' : 'No comments yet.'}
                    </p>
                )}
                {rootComments.map(c => (
                    <CommentItem key={c.id} comment={c} />
                ))}
            </div>

            <div className="shrink-0">
                {replyTo && (
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-t-lg text-xs">
                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <CornerDownRight size={10}/> {t.replyingTo} <span className="font-bold">{replyTo.username}</span>
                        </span>
                        <button onClick={() => setReplyTo(null)}><X size={12} className="dark:text-white"/></button>
                    </div>
                )}
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={t.addComment}
                        className={`flex-1 bg-gray-100 dark:bg-zinc-800 dark:text-white px-4 py-3 focus:outline-none transition-all ${replyTo ? 'rounded-b-2xl rounded-tr-2xl rounded-tl-none' : 'rounded-full'}`}
                    />
                    <button onClick={handleSubmit} disabled={!text.trim()} className="bg-black dark:bg-white dark:text-black text-white p-3 rounded-full disabled:opacity-50">
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CommentsModal;
    