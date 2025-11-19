
import React, { useState, useEffect, useRef } from 'react';
import { Screen, Note, User, NoteType, FontStyle, NoteColor, Comment } from './types';
import { INTERESTS, TRANSLATIONS } from './constants';
import { suggestTags } from './services/geminiService';
import { db } from './services/db';

import Layout from './components/Layout';
import NoteCard from './components/NoteCard';
import AudioPlayer from './components/AudioPlayer';
import { 
  ArrowRight, Mic, X, Sparkles, 
  Hash, LogOut, Type, Search, User as UserIcon, 
  ArrowLeft, Settings, Edit, MapPin, Send, Moon, Sun, Heart,
  Mail, Lock, Key, Check, ChevronRight, Loader2, Camera, Image as ImageIcon, HelpCircle, Shield, Bell
} from 'lucide-react';

// --- Sound Effects Helper ---
const playSystemSound = (type: 'success' | 'refresh') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'refresh') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

// --- Reusable Pull To Refresh Component ---
interface PullRefreshWrapperProps {
  children?: React.ReactNode;
  onRefresh: () => void;
  isDark?: boolean;
}

const PullRefreshWrapper: React.FC<PullRefreshWrapperProps> = ({ children, onRefresh, isDark = false }) => {
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
      if (window.scrollY === 0) {
          pullStartY.current = e.touches[0].clientY;
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (pullStartY.current > 0) {
          const pullY = e.touches[0].clientY - pullStartY.current;
          if (pullY > 0 && window.scrollY === 0) {
              setPullDistance(Math.min(pullY, 100)); // Cap at 100px
          }
      }
  };

  const handleTouchEnd = () => {
      if (pullDistance > 60) {
          setRefreshing(true);
          playSystemSound('refresh');
          onRefresh();
          setTimeout(() => {
              setRefreshing(false);
              setPullDistance(0);
          }, 1500);
      } else {
          setPullDistance(0);
      }
      pullStartY.current = 0;
  };

  return (
    <div 
      className="min-h-full transition-transform duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateY(${pullDistance / 2}px)` }}
    >
       <div 
         className="absolute top-0 left-0 w-full flex justify-center items-center overflow-hidden pointer-events-none"
         style={{ height: `${pullDistance}px`, opacity: pullDistance / 60, marginTop: `-${pullDistance}px` }}
       >
          {refreshing ? <Loader2 className={`animate-spin ${isDark ? 'text-white' : 'text-black'}`} /> : <ArrowRight className={`rotate-90 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
       </div>
       {children}
    </div>
  );
};

// --- Sub-Components ---

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
      <h1 className="text-5xl font-bold tracking-wider animate-fade-in mb-2 font-sans">Notos</h1>
      <p className="text-xs font-mono tracking-widest uppercase opacity-60 animate-slide-up">Share your echo</p>
    </div>
  );
};

// Updated Auth Screen - Email/Pass/User Sequence
const AuthScreen = ({ onLogin, t }: { onLogin: (email: string, username: string) => void, t: any }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Email, 2: Pass, 3: User, 4: OTP
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const nextStep = () => {
    if (isLoading) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(prev => (prev + 1) as any);
    }, 600);
  };

  const handleFinalLogin = () => {
    setIsLoading(true);
    // Simulate network request
    setTimeout(() => {
      onLogin(email, username);
    }, 1000);
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-white dark:bg-black p-8 flex flex-col justify-center transition-colors duration-500">
      <div className="mb-10 animate-fade-in">
        <h2 className="text-4xl font-bold mb-3 dark:text-white tracking-tight">{t.welcome}</h2>
        <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">
          {step === 1 && "Let's start with your email."}
          {step === 2 && "Create a secure password."}
          {step === 3 && "Choose a unique username."}
          {step === 4 && "Enter the code sent to your email."}
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-start pt-10">
        {step === 1 && (
          <div className="animate-slide-up w-full">
            <div className="relative group">
               <Mail className="absolute top-3.5 left-0 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={20} />
               <input 
                 type="email" 
                 value={email}
                 onChange={e => setEmail(e.target.value)}
                 placeholder="Email Address"
                 className="w-full py-3 pl-8 bg-transparent border-b border-gray-200 dark:border-gray-800 focus:border-black dark:focus:border-white outline-none transition-colors text-lg dark:text-white placeholder-gray-300"
                 autoFocus
               />
            </div>
            <button onClick={nextStep} disabled={!email.includes('@')} className="mt-8 w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold shadow-lg disabled:opacity-30 active:scale-95 transition-all">
               {isLoading ? <Loader2 className="mx-auto animate-spin" /> : t.continue}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up w-full">
             <div className="relative group">
               <Lock className="absolute top-3.5 left-0 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={20} />
               <input 
                 type="password" 
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 placeholder="Password"
                 className="w-full py-3 pl-8 bg-transparent border-b border-gray-200 dark:border-gray-800 focus:border-black dark:focus:border-white outline-none transition-colors text-lg dark:text-white placeholder-gray-300"
                 autoFocus
               />
            </div>
            <button onClick={nextStep} disabled={password.length < 6} className="mt-8 w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold shadow-lg disabled:opacity-30 active:scale-95 transition-all">
               {isLoading ? <Loader2 className="mx-auto animate-spin" /> : t.continue}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up w-full">
             <div className="relative group">
               <span className="absolute top-3.5 left-0 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors font-bold">@</span>
               <input 
                 type="text" 
                 value={username}
                 onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                 placeholder="username"
                 className="w-full py-3 pl-8 bg-transparent border-b border-gray-200 dark:border-gray-800 focus:border-black dark:focus:border-white outline-none transition-colors text-lg dark:text-white placeholder-gray-300"
                 autoFocus
               />
            </div>
            <button onClick={nextStep} disabled={username.length < 3} className="mt-8 w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold shadow-lg disabled:opacity-30 active:scale-95 transition-all">
               {isLoading ? <Loader2 className="mx-auto animate-spin" /> : t.continue}
            </button>
          </div>
        )}

        {step === 4 && (
           <div className="animate-slide-up w-full">
              <div className="flex justify-center mb-6">
                  <div className="bg-gray-100 dark:bg-zinc-900 px-4 py-2 rounded-lg flex items-center gap-2">
                     <span className="text-xs text-gray-500">Code sent to {email}</span>
                     <span className="font-mono font-bold dark:text-white">1234</span>
                  </div>
              </div>
              <div className="flex justify-center gap-4">
                 {[0,1,2,3].map(i => (
                    <input 
                      key={i}
                      id={`otp-${i}`}
                      value={otp[i] || ''}
                      onChange={(e) => {
                          const val = e.target.value;
                          const newOtp = otp.split('');
                          newOtp[i] = val;
                          setOtp(newOtp.join(''));
                          if(val && i < 3) document.getElementById(`otp-${i+1}`)?.focus();
                      }}
                      className="w-14 h-16 text-center text-2xl font-bold border rounded-xl bg-transparent border-gray-200 dark:border-gray-800 focus:border-black dark:focus:border-white dark:text-white outline-none"
                      maxLength={1}
                    />
                 ))}
              </div>
              <button onClick={handleFinalLogin} disabled={otp.length !== 4} className="mt-8 w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold shadow-lg disabled:opacity-30 active:scale-95 transition-all">
               {isLoading ? <Loader2 className="mx-auto animate-spin" /> : t.verifyEnter}
            </button>
           </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  // Navigation & User State
  const [screen, setScreen] = useState<Screen>(Screen.SPLASH);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Data State (Now loaded from DB)
  const [users, setUsers] = useState<User[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // UI State
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [activeInterest, setActiveInterest] = useState<string>(INTERESTS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileActiveTab, setProfileActiveTab] = useState<'NOTES' | 'LIKES'>('NOTES');
  
  // Modals & Sub-views
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeCommentNoteId, setActiveCommentNoteId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [followListType, setFollowListType] = useState<'FOLLOWERS' | 'FOLLOWING' | null>(null);
  
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Edit Profile State
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', avatarUrl: '', coverUrl: '' });
  const [editFiles, setEditFiles] = useState<{avatar?: File, cover?: File}>({});

  // Create Note State
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteAudioBlob, setNewNoteAudioBlob] = useState<Blob | null>(null);
  const [newNoteAudioUrl, setNewNoteAudioUrl] = useState<string | null>(null); // For preview
  const [newNoteDuration, setNewNoteDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [activeStyle, setActiveStyle] = useState({ font: FontStyle.SANS, color: NoteColor.WHITE, icon: 'Star' });
  const [isPolishing, setIsPolishing] = useState(false);

  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const t = TRANSLATIONS[lang];

  // --- Initial Load ---
  useEffect(() => {
    const initApp = async () => {
        const userLang = navigator.language.split('-')[0];
        setLang(userLang === 'ar' ? 'ar' : 'en');
        document.documentElement.dir = 'ltr';

        // Check if user is already logged in
        const loggedUser = await db.getCurrentUser();
        if (loggedUser) {
            setCurrentUser(loggedUser);
            setScreen(Screen.FEED);
        }
        
        refreshData();
    };
    
    // Allow splash screen to run a bit
    setTimeout(initApp, 500);
  }, []);

  // Toggle Dark Mode class on HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // Data Fetching
  const refreshData = async () => {
      const allUsers = await db.getAllUsers();
      const allNotes = await db.getNotes();
      // Resolve file URLs for audio notes if necessary
      const processedNotes = await Promise.all(allNotes.map(async (n) => {
          if (n.type === NoteType.AUDIO && n.audioUrl && !n.audioUrl.startsWith('blob') && !n.audioUrl.startsWith('http')) {
             const resolved = await db.getFileUrl(n.audioUrl);
             return { ...n, audioUrl: resolved || undefined };
          }
          return n;
      }));
      
      // Resolve avatar/cover URLs if they are stored as blob IDs
      const processedUsers = await Promise.all(allUsers.map(async (u) => {
           let av = u.avatarUrl;
           let cv = u.coverUrl;
           if (!av.startsWith('http')) { const r = await db.getFileUrl(av); if(r) av = r; }
           if (!cv.startsWith('http')) { const r = await db.getFileUrl(cv); if(r) cv = r; }
           return { ...u, avatarUrl: av, coverUrl: cv };
      }));

      setUsers(processedUsers);
      setNotes(processedNotes);

      if (currentUser) {
          const notifs = await db.getNotifications(currentUser.id);
          setNotifications(notifs);
      }
  };

  // Navigation Handlers
  const handleNavigate = (s: Screen) => {
    setScreen(s);
    setViewingUserId(null); 
    setFollowListType(null);
    setProfileActiveTab('NOTES');
    setSelectedTag(null);
    refreshData();
  };

  const handleUserClick = (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      setScreen(Screen.PROFILE);
    } else {
      setViewingUserId(userId);
      setScreen(Screen.USER_PROFILE);
    }
    setProfileActiveTab('NOTES');
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    setScreen(Screen.TAG_DETAILS);
  };

  const handleLogin = async (email: string, username: string) => {
    const user = await db.login(email, username);
    setCurrentUser(user);
    refreshData();
    setScreen(Screen.FEED);
  };

  const handleLogout = async () => {
      await db.logout();
      setCurrentUser(null);
      setScreen(Screen.AUTH);
  };

  const handleLike = async (noteId: string) => {
    if (!currentUser) return;
    await db.toggleLike(noteId, currentUser.id);
    // Optimistic UI update
    setNotes(prev => prev.map(n => {
        if (n.id === noteId) {
            return {
                ...n,
                likes: n.isLikedByCurrentUser ? n.likes - 1 : n.likes + 1,
                isLikedByCurrentUser: !n.isLikedByCurrentUser
            };
        }
        return n;
    }));
  };

  const handleFollowToggle = async (targetUserId: string) => {
      if (!currentUser) return;
      
      const { currentUser: updatedCurrent, targetUser: updatedTarget } = await db.toggleFollow(currentUser.id, targetUserId);
      
      setCurrentUser(updatedCurrent);
      setUsers(prev => prev.map(u => {
          if (u.id === updatedCurrent.id) return updatedCurrent;
          if (u.id === updatedTarget.id) return updatedTarget;
          return u;
      }));
  };

  const handleComment = (noteId: string) => {
    setActiveCommentNoteId(noteId);
  };

  const submitComment = async () => {
    if (!activeCommentNoteId || !commentInput.trim() || !currentUser) return;
    
    const newComment: Comment = {
        id: Date.now().toString(),
        userId: currentUser.id,
        text: commentInput,
        timestamp: Date.now()
    };

    await db.addComment(activeCommentNoteId, newComment);
    
    setNotes(prev => prev.map(n => {
      if (n.id === activeCommentNoteId) {
        return {
          ...n,
          comments: [...n.comments, newComment]
        };
      }
      return n;
    }));
    setCommentInput('');
    setActiveCommentNoteId(null); 
  };

  const handleCreateNote = async () => {
    if (!currentUser) return;
    if (!newNoteContent.trim() && !newNoteAudioBlob) return;

    let tags: string[] = [];
    if (newNoteContent.trim()) {
       tags = newNoteContent.match(/#[a-z0-9_]+/gi) || [];
    }

    let audioFileId = undefined;
    if (newNoteAudioBlob) {
        audioFileId = await db.uploadFile(newNoteAudioBlob);
    }
    
    const newNote: Note = {
      id: Date.now().toString(),
      userId: currentUser.id,
      author: currentUser,
      content: newNoteContent,
      type: audioFileId ? NoteType.AUDIO : NoteType.TEXT,
      audioUrl: audioFileId, // Store the ID, not the blob URL
      audioDuration: newNoteDuration || undefined,
      timestamp: Date.now(),
      likes: 0,
      isLikedByCurrentUser: false,
      comments: [],
      style: activeStyle,
      tags: tags
    };

    await db.createNote(newNote);
    
    // Refresh to get clean state (resolve URLs)
    await refreshData();

    setNewNoteContent('');
    setNewNoteAudioBlob(null);
    setNewNoteAudioUrl(null);
    setNewNoteDuration(0);
    
    playSystemSound('success');
    setScreen(Screen.FEED);
  };

  const handleAISuggestTags = async () => {
    if (!newNoteContent) return;
    setIsPolishing(true);
    const tags = await suggestTags(newNoteContent);
    setNewNoteContent(prev => `${prev}\n\n${tags.join(' ')}`);
    setIsPolishing(false);
  };

  // Actual MediaRecorder Implementation
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop Recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
    } else {
      // Start Recording
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

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setNewNoteAudioBlob(audioBlob);
          setNewNoteAudioUrl(audioUrl);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setNewNoteDuration(0);
        
        timerRef.current = setInterval(() => {
            setNewNoteDuration(prev => prev + 1);
        }, 1000);

      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Could not access microphone. Please check permissions.");
      }
    }
  };

  const openEditProfile = () => {
    if (currentUser) {
      setEditForm({
        displayName: currentUser.displayName,
        bio: currentUser.bio,
        avatarUrl: currentUser.avatarUrl,
        coverUrl: currentUser.coverUrl
      });
      setEditFiles({});
      setIsEditingProfile(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'coverUrl') => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setEditForm(prev => ({ ...prev, [field]: url }));
          setEditFiles(prev => ({ ...prev, [field === 'avatarUrl' ? 'avatar' : 'cover']: file }));
      }
  };

  const saveProfile = async () => {
    if (currentUser) {
      let avUrl = currentUser.avatarUrl;
      let cvUrl = currentUser.coverUrl;

      if (editFiles.avatar) {
          avUrl = await db.uploadFile(editFiles.avatar);
      }
      if (editFiles.cover) {
          cvUrl = await db.uploadFile(editFiles.cover);
      }

      const updated = await db.updateUser(currentUser.id, {
          displayName: editForm.displayName,
          bio: editForm.bio,
          avatarUrl: avUrl,
          coverUrl: cvUrl
      });
      
      setCurrentUser(updated);
      await refreshData();
      setIsEditingProfile(false);
    }
  };

  const handleRefresh = () => {
      refreshData();
  };

  // Filtering Logic
  const getFilteredNotes = () => {
    let filtered = notes;
    if (activeInterest === 'For You' || activeInterest === 'الرئيسية') {
      filtered = [...notes].sort((a, b) => b.timestamp - a.timestamp);
    } else if (activeInterest === 'Trending' || activeInterest === 'الأكثر تداولاً') {
       filtered = [...notes].sort((a, b) => b.likes - a.likes);
    } else {
       const keyword = (activeInterest as string).toLowerCase();
       filtered = notes.filter(n => 
         n.tags.some((tag: string) => tag.toLowerCase().includes(keyword)) ||
         (n.content as string).toLowerCase().includes(keyword)
       );
    }
    return filtered;
  };

  const getDiscoverData = () => {
    const tagCounts: Record<string, number> = {};
    notes.forEach(n => n.tags.forEach(t => {
       tagCounts[t] = (tagCounts[t] || 0) + 1;
    }));
    const topTags = Object.entries(tagCounts).sort((a,b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
    const creators = [...users].filter(u => u.id !== currentUser?.id).slice(0, 3);
    return { topTags, creators };
  };

  const getSearchResults = () => {
    if (!searchQuery) return { tags: [], accounts: [] };
    const q = (searchQuery as string).toLowerCase();
    const tags = Array.from(new Set(notes.flatMap(n => n.tags))).filter((t: string) => t.toLowerCase().includes(q)).slice(0, 5);
    const accounts = users.filter(u => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)).slice(0, 10);
    return { tags, accounts };
  };

  // --- Render Screen Content ---

  const renderContent = () => {
    if (screen === Screen.SPLASH) return <SplashScreen onFinish={() => {}} />; // Finish handled in useEffect
    if (screen === Screen.AUTH) return <AuthScreen onLogin={handleLogin} t={t} />;
    
    if (screen === Screen.CREATE) {
        const isDarkBg = activeStyle.color.includes('slate') || activeStyle.color.includes('black') || activeStyle.color.includes('text-white');
        const textColor = isDarkBg ? 'text-white' : 'text-gray-900 dark:text-white';
        const placeholderColor = isDarkBg ? 'placeholder-gray-300' : 'placeholder-gray-400';

        return (
          <div className="h-full flex flex-col bg-white dark:bg-black transition-colors duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10 z-10 bg-inherit">
              <button onClick={() => setScreen(Screen.FEED)} className="dark:text-white"><X size={24} /></button>
              <span className="font-bold text-lg dark:text-white">{t.newNote}</span>
              <button 
                onClick={handleCreateNote}
                className="text-indigo-600 dark:text-indigo-400 font-bold disabled:opacity-50"
                disabled={!newNoteContent && !newNoteAudioBlob}
              >
                {t.post}
              </button>
            </div>
            
            <div className={`flex-1 p-6 transition-all duration-500 flex flex-col ${activeStyle.color}`}>
              <textarea
                placeholder={t.placeholder}
                className={`w-full h-64 bg-transparent resize-none outline-none text-2xl ${placeholderColor} ${activeStyle.font} ${textColor}`}
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
              />

              {newNoteAudioUrl && (
                 <div className="mt-4 mb-4 p-4 bg-white/20 rounded-2xl border border-black/5 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-50">{t.voiceNote}</span>
                        <button onClick={() => { setNewNoteAudioBlob(null); setNewNoteAudioUrl(null); setNewNoteDuration(0); }}><X size={14}/></button>
                    </div>
                    <AudioPlayer duration={newNoteDuration} src={newNoteAudioUrl} colorClass={isDarkBg ? 'text-white' : 'text-black'} />
                 </div>
              )}
              
              <div className="mt-auto space-y-4">
                <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
                   <button 
                     onClick={handleAISuggestTags}
                     disabled={isPolishing || !newNoteContent}
                     className="flex items-center gap-2 px-3 py-1.5 bg-white/30 backdrop-blur-sm rounded-full text-xs font-bold shadow-sm"
                   >
                     <Hash size={12} /> {t.autoTags}
                   </button>
                   {isRecording && <span className="text-red-500 font-mono animate-pulse flex items-center">Recording... {newNoteDuration}s</span>}
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                   {[
                     { color: NoteColor.WHITE, label: t.plain },
                     { color: NoteColor.YELLOW, label: t.sun },
                     { color: NoteColor.BLUE, label: t.sky },
                     { color: NoteColor.ROSE, label: t.rose },
                     { color: NoteColor.VIOLET, label: t.mystic },
                     { color: NoteColor.DARK, label: t.midnight },
                   ].map(style => (
                     <button
                       key={style.label}
                       onClick={() => setActiveStyle({ ...activeStyle, color: style.color })}
                       className={`min-w-[36px] h-9 rounded-full border-2 shadow-sm ${style.color.replace('text-white', '')} ${activeStyle.color === style.color ? 'border-black dark:border-white scale-110' : 'border-transparent'}`}
                     />
                   ))}
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/10">
                   <button 
                      onClick={toggleRecording}
                      className={`p-4 rounded-full transition-colors shadow-lg active:scale-95 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-zinc-800 text-black dark:text-white'}`}
                   >
                     <Mic size={24} />
                   </button>
                   <div className="flex gap-4 text-gray-400">
                     <button onClick={() => setActiveStyle({...activeStyle, font: FontStyle.SERIF})} className={`p-2 rounded-lg ${activeStyle.font === FontStyle.SERIF ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white' : ''}`}><Type size={24} /></button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        );
    }

    // --- Common Layout Wrappers ---
    const commonProps = {
        currentScreen: screen,
        onNavigate: handleNavigate,
        hasUnreadNotifications: notifications.filter(n => !n.read).length > 0,
        labels: { home: t.home, discover: t.discover, activity: t.activity, profile: t.profile }
    };

    if (screen === Screen.FEED) {
        const filteredNotes = getFilteredNotes();
        return (
          <Layout {...commonProps}>
             <div className="bg-gray-50 dark:bg-black min-h-full transition-colors duration-300">
               <PullRefreshWrapper onRefresh={handleRefresh} isDark={darkMode}>
                  <div className="pt-4 pb-6 px-4">
                     {/* Header */}
                     <div className="flex justify-between items-center mb-6">
                       <button onClick={() => setActiveInterest('For You')} className="text-2xl font-bold dark:text-white">Notos</button>
                       <button onClick={toggleTheme} className="p-2 rounded-full bg-white dark:bg-zinc-800 shadow-sm hover:scale-110 transition-transform">
                          {darkMode ? <Sun size={20} className="text-white" /> : <Moon size={20} />}
                       </button>
                     </div>

                     <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
                       {INTERESTS.map((interest) => (
                         <button 
                           key={interest} 
                           onClick={() => setActiveInterest(interest)}
                           className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${activeInterest === interest ? 'bg-black text-white dark:bg-white dark:text-black shadow-md scale-105' : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-zinc-800'}`}
                         >
                           {interest}
                         </button>
                       ))}
                     </div>
                     
                     {filteredNotes.length === 0 ? (
                         <div className="text-center py-20 opacity-50 dark:text-white">
                             <p>{t.noNotes}</p>
                         </div>
                     ) : (
                         <div className="space-y-4 pb-24">
                            {filteredNotes.map(note => (
                                <NoteCard 
                                key={note.id} 
                                note={note} 
                                onLike={handleLike} 
                                onComment={handleComment}
                                onUserClick={handleUserClick}
                                />
                            ))}
                        </div>
                     )}
                  </div>
               </PullRefreshWrapper>
             </div>
          </Layout>
        );
    }

    if (screen === Screen.DISCOVER) {
        const { topTags, creators } = getDiscoverData();
        const { tags, accounts } = getSearchResults();

        return (
          <Layout {...commonProps}>
            <div className="bg-gray-50 dark:bg-black min-h-full transition-colors duration-300">
              <PullRefreshWrapper onRefresh={handleRefresh} isDark={darkMode}>
                <div className="p-4 pb-24">
                    <div className="relative mb-6 sticky top-0 z-10 pt-2 bg-gray-50/90 dark:bg-black/90 backdrop-blur-md pb-2">
                        <input 
                        type="text" 
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 dark:text-white rounded-2xl py-3.5 pl-11 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-shadow"
                        />
                        <div className="absolute top-6 left-4 text-gray-400">
                            <Search size={20} />
                        </div>
                    </div>

                    {searchQuery ? (
                        <div className="space-y-6 animate-fade-in">
                            {tags.length > 0 && (
                                <div>
                                    <h3 className="font-bold mb-3 text-lg dark:text-white">{t.tags}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => (
                                            <button 
                                            key={tag as string} 
                                            onClick={() => handleTagClick(tag as string)}
                                            className="bg-white dark:bg-zinc-900 dark:text-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                                            >
                                            {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {accounts.length > 0 && (
                                <div>
                                    <h3 className="font-bold mb-3 text-lg dark:text-white">{t.accounts}</h3>
                                    <div className="space-y-3">
                                        {accounts.map(user => {
                                            const isFollowing = currentUser?.followingIds.includes(user.id);
                                            return (
                                            <div key={user.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-2xl shadow-sm">
                                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleUserClick(user.id)}>
                                                    <img src={user.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt=""/>
                                                    <div>
                                                        <p className="font-bold text-sm dark:text-white">{user.displayName}</p>
                                                        <p className="text-xs text-gray-500">@{user.username}</p>
                                                    </div>
                                                </div>
                                                {currentUser && user.id !== currentUser.id && (
                                                <button 
                                                    onClick={() => handleFollowToggle(user.id)}
                                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${isFollowing ? 'bg-gray-100 dark:bg-zinc-800 text-black dark:text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}
                                                >
                                                    {isFollowing ? t.unfollow : t.follow}
                                                </button>
                                                )}
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="animate-slide-up">
                            <div className="mb-8">
                                <h3 className="font-bold mb-3 text-lg dark:text-white">{t.trending}</h3>
                                <div className="grid grid-cols-2 gap-3">
                                {topTags.map(tag => (
                                    <button 
                                    key={tag as string} 
                                    onClick={() => handleTagClick(tag as string)}
                                    className="bg-white dark:bg-zinc-900 p-4 rounded-2xl text-black dark:text-white font-bold text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-sm border border-gray-100 dark:border-zinc-800"
                                    >
                                    {tag}
                                    </button>
                                ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold mb-3 text-lg dark:text-white">{t.featured}</h3>
                                <div className="space-y-3">
                                {creators.map(user => {
                                    const isFollowing = currentUser?.followingIds.includes(user.id);
                                    return (
                                    <div key={user.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                                    <div 
                                        className="flex items-center gap-3 cursor-pointer"
                                        onClick={() => handleUserClick(user.id)}
                                    >
                                        <img src={user.avatarUrl} className="w-12 h-12 rounded-full object-cover" alt=""/>
                                        <div>
                                        <p className="font-bold text-sm dark:text-white">{user.displayName}</p>
                                        <p className="text-xs text-gray-500">@{user.username}</p>
                                        </div>
                                    </div>
                                    <button 
                                    onClick={() => handleFollowToggle(user.id)}
                                    className={`px-5 py-2 text-xs font-bold rounded-full transition-colors ${isFollowing ? 'bg-gray-100 dark:bg-zinc-800 text-black dark:text-white' : 'bg-black dark:bg-white dark:text-black text-white'}`}
                                    >
                                        {isFollowing ? t.unfollow : t.follow}
                                    </button>
                                    </div>
                                )})}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              </PullRefreshWrapper>
            </div>
          </Layout>
        );
    }

    if (screen === Screen.SETTINGS) {
        return (
            <Layout {...commonProps}>
                <div className="min-h-full bg-white dark:bg-black animate-slide-up">
                    <div className="p-4 flex items-center gap-4 border-b border-gray-100 dark:border-zinc-800">
                        <button onClick={() => setScreen(Screen.PROFILE)} className="dark:text-white"><ArrowLeft /></button>
                        <h2 className="text-xl font-bold dark:text-white">{t.settings}</h2>
                    </div>
                    <div className="p-4 space-y-6">
                        <div className="space-y-1">
                             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Account</h3>
                             <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl overflow-hidden">
                                 <button className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white">
                                     <div className="flex items-center gap-3"><UserIcon size={20}/> Personal Information</div>
                                     <ChevronRight size={16} className="text-gray-400"/>
                                 </button>
                                 <div className="h-px bg-gray-200 dark:bg-zinc-800 w-full"></div>
                                 <button className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white">
                                     <div className="flex items-center gap-3"><Shield size={20}/> Security</div>
                                     <ChevronRight size={16} className="text-gray-400"/>
                                 </button>
                             </div>
                        </div>

                        <div className="space-y-1">
                             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">App</h3>
                             <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl overflow-hidden">
                                 <button className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white">
                                     <div className="flex items-center gap-3"><Bell size={20}/> Notifications</div>
                                     <ChevronRight size={16} className="text-gray-400"/>
                                 </button>
                                 <div className="h-px bg-gray-200 dark:bg-zinc-800 w-full"></div>
                                 <button onClick={toggleTheme} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white">
                                     <div className="flex items-center gap-3">{darkMode ? <Sun size={20}/> : <Moon size={20}/>} Appearance</div>
                                     <span className="text-xs text-gray-400">{darkMode ? 'Dark' : 'Light'}</span>
                                 </button>
                                 <div className="h-px bg-gray-200 dark:bg-zinc-800 w-full"></div>
                                 <button className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white">
                                     <div className="flex items-center gap-3"><HelpCircle size={20}/> Help & Support</div>
                                     <ChevronRight size={16} className="text-gray-400"/>
                                 </button>
                             </div>
                        </div>

                        <button 
                            onClick={handleLogout}
                            className="w-full p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl font-bold flex justify-center items-center gap-2 mt-8"
                        >
                            <LogOut size={20} /> {t.logout}
                        </button>
                        <div className="text-center text-xs text-gray-300 mt-4">Version 1.0.2 (iOS)</div>
                    </div>
                </div>
            </Layout>
        )
    }

    if (screen === Screen.TAG_DETAILS) {
        const tagNotes = notes.filter(n => n.tags.includes((selectedTag as string) || ''));
        return (
            <Layout {...commonProps}>
                <div className="bg-gray-50 dark:bg-black min-h-full transition-colors duration-300">
                    <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md p-4 flex items-center gap-3 border-b border-gray-100 dark:border-zinc-800">
                        <button onClick={() => setScreen(Screen.DISCOVER)} className="dark:text-white"><ArrowLeft /></button>
                        <div>
                            <h2 className="font-bold text-lg dark:text-white">{selectedTag}</h2>
                            <p className="text-xs text-gray-500">{tagNotes.length} {t.postsWith}</p>
                        </div>
                    </div>
                    <div className="p-4 space-y-4 pb-24">
                        {tagNotes.map(note => (
                             <NoteCard 
                                key={note.id} 
                                note={note} 
                                onLike={handleLike} 
                                onComment={handleComment}
                                onUserClick={handleUserClick}
                             />
                        ))}
                    </div>
                </div>
            </Layout>
        );
    }

    if (screen === Screen.NOTIFICATIONS) {
        return (
            <Layout {...commonProps}>
             <div className="bg-gray-50 dark:bg-black min-h-full transition-colors duration-300">
               <PullRefreshWrapper onRefresh={handleRefresh} isDark={darkMode}>
                 <div className="p-4 pb-24">
                    <h2 className="text-3xl font-bold mb-6 dark:text-white tracking-tight">{t.activity}</h2>
                    <div className="space-y-4">
                        {notifications.map(notif => (
                        <div 
                            key={notif.id} 
                            onClick={() => handleUserClick(notif.fromUser.id)}
                            className="flex gap-4 items-center p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm cursor-pointer border border-gray-50 dark:border-zinc-800"
                        >
                            <div className={`p-3 rounded-full shrink-0 ${notif.type === 'LIKE' ? 'bg-rose-100 text-rose-500 dark:bg-rose-900/30' : 'bg-blue-100 text-blue-500 dark:bg-blue-900/30'}`}>
                                {notif.type === 'LIKE' ? <HeartIcon size={18} /> : <UserIcon size={18} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm dark:text-white leading-snug">
                                <span className="font-bold">{notif.fromUser.displayName}</span>
                                {notif.type === 'LIKE' ? ` ${t.liked}` : ` ${t.startedFollowing}`}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 font-medium">2h ago</p>
                            </div>
                            {notif.type === 'FOLLOW' && (
                                <button className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-full">Follow</button>
                            )}
                        </div>
                        ))}
                    </div>
                 </div>
               </PullRefreshWrapper>
             </div>
           </Layout>
        );
    }

    // Profile Logic
    if (screen === Screen.PROFILE || screen === Screen.USER_PROFILE) {
        const targetUser = screen === Screen.PROFILE ? currentUser : users.find(u => u.id === viewingUserId);
        if (!targetUser) return null; 

        const isSelf = screen === Screen.PROFILE || (currentUser && targetUser.id === currentUser.id);
        const isFollowing = currentUser?.followingIds.includes(targetUser.id);
        
        const displayedNotes = profileActiveTab === 'NOTES' 
            ? notes.filter(n => n.userId === targetUser.id)
            : notes.filter(n => isSelf ? n.isLikedByCurrentUser : n.likes > 50); 

        return (
          <Layout {...commonProps}>
             <div className="bg-white dark:bg-black min-h-full pb-20 transition-colors duration-300">
                <PullRefreshWrapper onRefresh={handleRefresh} isDark={darkMode}>
                    {/* Cover Image */}
                    <div className="relative h-48 bg-gray-900 overflow-hidden">
                        <img src={targetUser.coverUrl} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500" alt="cover"/>
                        <div className="absolute top-4 left-4 z-10">
                            {!isSelf && (
                                <button onClick={() => setScreen(Screen.FEED)} className="p-2 bg-white/20 backdrop-blur text-white rounded-full hover:bg-white/30 transition-colors">
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                        </div>
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                                {isSelf && (
                                    <button 
                                        onClick={() => setScreen(Screen.SETTINGS)}
                                        className="p-2 bg-white/20 backdrop-blur text-white rounded-full hover:bg-white/30 transition-colors"
                                    >
                                        <Settings size={20} />
                                    </button>
                                )}
                        </div>
                    </div>

                    <div className="relative px-4 -mt-12 mb-4">
                        <button onClick={() => setPreviewImage(targetUser.avatarUrl)} className="relative">
                            <img src={targetUser.avatarUrl} className="w-24 h-24 rounded-full border-4 border-white dark:border-black bg-white object-cover shadow-lg" alt="" />
                        </button>
                    </div>

                    <div className="px-4 pb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-1 dark:text-white tracking-tight">
                                {targetUser.displayName}
                                {targetUser.badges.length > 0 && <Sparkles size={16} className="text-yellow-500 fill-yellow-500" />}
                                </h2>
                                <p className="text-gray-500 text-sm font-medium">@{targetUser.username}</p>
                            </div>

                            {/* Button moved here for alignment */}
                            {!isSelf ? (
                            <button 
                                onClick={() => handleFollowToggle(targetUser.id)}
                                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95 ${isFollowing ? 'bg-gray-100 dark:bg-zinc-800 text-black dark:text-white' : 'bg-black dark:bg-white dark:text-black text-white shadow-lg'}`}
                            >
                                {isFollowing ? t.unfollow : t.follow}
                            </button>
                            ) : (
                            <button 
                                onClick={openEditProfile} 
                                className="px-6 py-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full font-bold text-sm dark:text-white transition-colors hover:bg-gray-200 dark:hover:bg-zinc-700"
                            >
                                {t.editProfile}
                            </button>
                            )}
                        </div>
                    
                        <p className="mt-4 text-base dark:text-gray-200 leading-relaxed max-w-md">{targetUser.bio}</p>
                    
                        <div className="flex gap-6 mt-6 text-sm font-bold dark:text-white border-b border-gray-100 dark:border-zinc-800 pb-6">
                            <button onClick={() => { setFollowListType('FOLLOWERS'); setScreen(Screen.FOLLOW_LIST); }} className="hover:opacity-70 transition-opacity">
                                {targetUser.followers} <span className="font-medium text-gray-500">{t.followers}</span>
                            </button>
                            <button onClick={() => { setFollowListType('FOLLOWING'); setScreen(Screen.FOLLOW_LIST); }} className="hover:opacity-70 transition-opacity">
                                {targetUser.following} <span className="font-medium text-gray-500">{t.following}</span>
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex sticky top-0 bg-white dark:bg-black z-10">
                        <button 
                            onClick={() => setProfileActiveTab('NOTES')}
                            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-all ${profileActiveTab === 'NOTES' ? 'border-black dark:border-white dark:text-white' : 'border-gray-100 dark:border-zinc-800 text-gray-400'}`}
                        >
                            {t.notes}
                        </button>
                        <button 
                            onClick={() => setProfileActiveTab('LIKES')}
                            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-all ${profileActiveTab === 'LIKES' ? 'border-black dark:border-white dark:text-white' : 'border-gray-100 dark:border-zinc-800 text-gray-400'}`}
                        >
                            {t.likes}
                        </button>
                    </div>

                    <div className="p-4 space-y-4 bg-gray-50 dark:bg-zinc-900/50 min-h-[300px]">
                    {displayedNotes.map(note => (
                        <NoteCard 
                            key={note.id} 
                            note={note} 
                            onLike={handleLike} 
                            onComment={handleComment}
                            onUserClick={handleUserClick}
                        />
                    ))}
                    </div>
                </PullRefreshWrapper>
             </div>
          </Layout>
        );
    }

    if (screen === Screen.FOLLOW_LIST) {
        const list = followListType === 'FOLLOWERS' ? users : users.slice(0, 2); // Simplification for demo logic
        return (
            <Layout {...commonProps}>
                <div className="bg-white dark:bg-black min-h-full p-4 transition-colors duration-300">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setScreen(Screen.PROFILE)} className="dark:text-white"><ArrowLeft /></button>
                        <h2 className="text-xl font-bold dark:text-white">{followListType === 'FOLLOWERS' ? t.followers : t.following}</h2>
                    </div>
                    <div className="space-y-4">
                        {list.map(u => {
                             const isFollowing = currentUser?.followingIds.includes(u.id);
                             return (
                             <div key={u.id} className="flex items-center justify-between p-2">
                                 <div className="flex items-center gap-3" onClick={() => handleUserClick(u.id)}>
                                     <img src={u.avatarUrl} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                                     <div>
                                         <p className="font-bold dark:text-white">{u.displayName}</p>
                                         <p className="text-gray-500 text-sm">@{u.username}</p>
                                     </div>
                                 </div>
                                 {currentUser && u.id !== currentUser.id && (
                                     <button 
                                        onClick={() => handleFollowToggle(u.id)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${isFollowing ? 'bg-gray-100 dark:bg-zinc-800 text-black dark:text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}
                                     >
                                         {isFollowing ? t.unfollow : t.follow}
                                     </button>
                                 )}
                             </div>
                        )})}
                    </div>
                </div>
            </Layout>
        )
    }

    return null;
  };

  return (
    <div className="h-full w-full bg-gray-200 dark:bg-gray-900 flex justify-center font-sans">
      <div className="w-full max-w-md h-full max-h-[900px] bg-white dark:bg-black shadow-2xl relative overflow-hidden sm:rounded-[3rem] sm:my-auto sm:h-[95vh] border-4 border-black dark:border-zinc-800">
        {renderContent()}

        {/* Comment Modal Overlay */}
        {activeCommentNoteId && (
          <div className="absolute inset-0 bg-black/50 z-[60] flex items-end backdrop-blur-sm" onClick={() => setActiveCommentNoteId(null)}>
            <div 
               className="bg-white dark:bg-zinc-900 w-full rounded-t-3xl p-6 animate-slide-up shadow-2xl"
               onClick={e => e.stopPropagation()}
            >
               <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">
                 <h3 className="font-bold dark:text-white">{t.comments}</h3>
                 <button onClick={() => setActiveCommentNoteId(null)}><X size={20} className="dark:text-white"/></button>
               </div>
               <div className="h-48 overflow-y-auto mb-4 space-y-3">
                  {notes.find(n => n.id === activeCommentNoteId)?.comments.map(c => (
                      <div key={c.id} className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl">
                          <p className="text-xs font-bold mb-1 dark:text-white">Guest</p>
                          <p className="text-sm dark:text-gray-300">{c.text}</p>
                      </div>
                  ))}
               </div>
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder={t.addComment}
                    className="flex-1 bg-gray-100 dark:bg-zinc-800 dark:text-white rounded-full px-4 py-3 focus:outline-none"
                  />
                  <button onClick={submitComment} className="bg-black dark:bg-white dark:text-black text-white p-3 rounded-full">
                      <ArrowRight size={20} />
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Edit Profile Modal Overlay */}
        {isEditingProfile && (
            <div className="absolute inset-0 bg-white dark:bg-black z-[60] animate-slide-up flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-zinc-800">
                    <button onClick={() => setIsEditingProfile(false)} className="dark:text-white">{t.cancel}</button>
                    <h2 className="font-bold text-lg dark:text-white">{t.editProfile}</h2>
                    <button onClick={saveProfile} className="text-black dark:text-white font-bold">{t.save}</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="flex flex-col items-center gap-4">
                         {/* Image Uploads with File Input */}
                         <div className="relative">
                            <img src={editForm.avatarUrl} className="w-28 h-28 rounded-full object-cover border-4 border-gray-100 dark:border-zinc-800" />
                            <label className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full cursor-pointer shadow-lg hover:scale-105 transition-transform">
                                <Camera size={16} />
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'avatarUrl')} />
                            </label>
                         </div>
                         
                         <div className="w-full">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-2 text-center">Cover Image</label>
                             <div className="relative h-32 w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-900">
                                 <img src={editForm.coverUrl} className="w-full h-full object-cover opacity-70" />
                                 <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-black/10 transition-colors">
                                     <div className="bg-black/50 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm backdrop-blur-md">
                                         <ImageIcon size={16} /> Change Cover
                                     </div>
                                     <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'coverUrl')} />
                                 </label>
                             </div>
                         </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-500">{t.name}</label>
                            <input 
                               value={editForm.displayName} 
                               onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                               className="w-full border-b border-gray-200 dark:border-zinc-800 py-3 focus:outline-none bg-transparent dark:text-white text-lg"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-500 flex justify-between">
                                {t.username}
                                {currentUser?.lastUsernameChange && Date.now() - currentUser.lastUsernameChange < 604800000 && (
                                    <span className="text-red-400 text-xs font-normal">Changed this week</span>
                                )}
                            </label>
                             <div className="flex items-center border-b border-gray-200 dark:border-zinc-800 dark:text-white">
                                <span className="text-gray-400 mr-1 font-bold">@</span>
                                <input 
                                    disabled // Mock logic: Assuming cooldown is active for demo
                                    value={currentUser?.username} 
                                    className="w-full py-3 focus:outline-none bg-transparent opacity-50"
                                />
                             </div>
                             <p className="text-xs text-gray-400">You can change your username once every 7 days.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-500 flex justify-between">
                                {t.bio}
                                <span className={`${editForm.bio.length > 180 ? 'text-red-500' : 'text-gray-400'}`}>{editForm.bio.length}/180</span>
                            </label>
                            <textarea 
                               value={editForm.bio} 
                               onChange={e => e.target.value.length <= 180 && setEditForm({...editForm, bio: e.target.value})}
                               className="w-full border-b border-gray-200 dark:border-zinc-800 py-2 focus:outline-none bg-transparent resize-none dark:text-white h-24 text-base leading-relaxed"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Image Preview Lightbox */}
        {previewImage && (
            <div 
                className="absolute inset-0 z-[70] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in"
                onClick={() => setPreviewImage(null)}
            >
                <img src={previewImage} className="w-full max-h-[80vh] object-contain" />
                <button className="absolute top-8 right-6 text-white bg-white/20 rounded-full p-2 backdrop-blur">
                    <X />
                </button>
            </div>
        )}

      </div>
    </div>
  );
}

const HeartIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
