

import React, { useState, useEffect, useRef } from 'react';
import { Screen, Note, User, NoteType, FontStyle, NoteColor, Comment, Notification } from './types';
import { INTERESTS, TRANSLATIONS, DEFAULT_TRENDING_TAGS } from './constants';
import { suggestTags } from './services/geminiService';
import { db } from './services/db';

import Layout from './components/Layout';
import NoteCard from './components/NoteCard';
import AudioPlayer from './components/AudioPlayer';
import { 
  ArrowRight, Mic, X, Sparkles, 
  Hash, LogOut, Type, Search, User as UserIcon, 
  ArrowLeft, Settings, Edit, MapPin, Send, Moon, Sun, Heart,
  Mail, Lock, Key, Check, ChevronRight, Loader2, Camera, Image as ImageIcon, HelpCircle, Shield, Bell, CheckCircle2,
  Plane, Cpu, Newspaper, Feather, Zap, Globe, Palette, Code, Flame, Smile, Music, Star, ToggleLeft, ToggleRight,
  UserPlus
} from 'lucide-react';

// --- Sound Effects Helper ---
const playSystemSound = (type: 'success' | 'refresh' | 'notification') => {
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
    } else if (type === 'notification') {
        // Gentle 'pop' sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

const AVAILABLE_ICONS = [
  { id: 'Star', icon: Star, label: 'General' },
  { id: 'Feather', icon: Feather, label: 'Poetry' },
  { id: 'Mic', icon: Mic, label: 'Singing' },
  { id: 'Music', icon: Music, label: 'Music' },
  { id: 'Plane', icon: Plane, label: 'Travel' },
  { id: 'Camera', icon: Camera, label: 'Photo' },
  { id: 'Palette', icon: Palette, label: 'Art' },
  { id: 'Code', icon: Code, label: 'Tech' },
  { id: 'Cpu', icon: Cpu, label: 'Hardware' },
  { id: 'Newspaper', icon: Newspaper, label: 'News' },
  { id: 'Flame', icon: Flame, label: 'Trending' },
  { id: 'Zap', icon: Zap, label: 'Idea' },
  { id: 'Globe', icon: Globe, label: 'World' },
];

// --- Dynamic Island Component (Refined - Clean & Minimal) ---
interface DynamicToastProps {
    message: string;
    type: 'success' | 'notification';
    visible: boolean;
    icon?: React.ReactNode;
}

const DynamicIsland: React.FC<DynamicToastProps> = ({ message, type, visible, icon }) => {
    // Refined logic: When invisible, it's a tiny pill (mimicking the physical island size roughly).
    // When visible, it expands elastically.
    // Removed fake sensors/cameras for a cleaner look.
    
    return (
        <div 
            className={`fixed left-1/2 transform -translate-x-1/2 z-[100] bg-black text-white overflow-hidden flex items-center justify-between
                        shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]
                        ${visible 
                            ? 'top-3 w-[92%] max-w-[360px] h-[58px] rounded-[32px] px-1' 
                            : 'top-3 w-[0px] h-[0px] opacity-0 rounded-full' // Completely hidden when inactive to show underlying notch
                        }`}
        >
            {/* Content - Left (Icon) */}
            <div className={`pl-4 flex items-center transition-all duration-300 delay-75 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <div className="scale-90">
                    {icon || (type === 'success' ? <CheckCircle2 size={22} className="text-green-400" /> : <Bell size={22} className="text-rose-400" />)}
                </div>
            </div>

            {/* Content - Right (Message) */}
            <div className={`flex-1 text-center px-2 transition-all duration-300 delay-75 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                 <span className="text-sm font-semibold truncate block leading-tight tracking-tight">{message}</span>
            </div>
            
            {/* Content - Far Right (Sound Visualizer) */}
            <div className={`pr-4 flex items-center justify-end transition-all duration-300 delay-75 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                 <div className="flex gap-[3px] items-center h-3">
                     <div className="w-[3px] bg-white/80 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2"></div>
                     <div className="w-[3px] bg-white/80 rounded-full animate-[pulse_1.0s_ease-in-out_infinite_0.1s] h-4"></div>
                     <div className="w-[3px] bg-white/80 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.2s] h-2.5"></div>
                 </div>
            </div>
        </div>
    );
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
      className="min-h-full transition-transform duration-300 ease-out"
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
      <h1 className="text-5xl font-bold tracking-wider animate-fade-in mb-2 font-sans">Notos</h1>
      <p className="text-xs font-mono tracking-widest uppercase opacity-60 animate-slide-up">Share your echo</p>
    </div>
  );
};

// Updated Auth Screen - Adjusted Top Spacing & Validation
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

  // Validation Logic
  const emailValid = email.includes('@') && email.endsWith('.com');
  const passValid = password.length >= 6 && /[a-zA-Z]/.test(password) && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password);
  const userValid = username.length >= 3;

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-white dark:bg-black px-8 flex flex-col justify-start transition-colors duration-500 pt-32"> 
      
      <div className="mb-10 animate-fade-in">
        <h2 className="text-4xl font-bold mb-3 dark:text-white tracking-tight">{t.welcome}</h2>
        <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">
          {step === 1 && "Let's start with your email."}
          {step === 2 && "Create a secure password."}
          {step === 3 && "Choose a unique username."}
          {step === 4 && "Enter the code sent to your email."}
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-start pt-4">
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
            <button onClick={nextStep} disabled={!emailValid} className="mt-8 w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold shadow-lg disabled:opacity-30 active:scale-95 transition-all">
               {isLoading ? <Loader2 className="mx-auto animate-spin" /> : t.continue}
            </button>
            <p className="mt-4 text-xs text-center text-gray-400">{t.emailReq}</p>
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
            <button onClick={nextStep} disabled={!passValid} className="mt-8 w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold shadow-lg disabled:opacity-30 active:scale-95 transition-all">
               {isLoading ? <Loader2 className="mx-auto animate-spin" /> : t.continue}
            </button>
            <p className="mt-4 text-xs text-center text-gray-400">{t.passReq}</p>
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
            <button onClick={nextStep} disabled={!userValid} className="mt-8 w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold shadow-lg disabled:opacity-30 active:scale-95 transition-all">
               {isLoading ? <Loader2 className="mx-auto animate-spin" /> : t.continue}
            </button>
            <p className="mt-4 text-xs text-center text-gray-400">{t.userReq}</p>
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // UI State
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [activeInterest, setActiveInterest] = useState<string>(INTERESTS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileActiveTab, setProfileActiveTab] = useState<'NOTES' | 'LIKES'>('NOTES');
  const [settingsView, setSettingsView] = useState<'MAIN' | 'PERSONAL' | 'SECURITY' | 'NOTIFICATIONS'>('MAIN');
  
  // Toast / Dynamic Island State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'notification', visible: boolean, icon?: React.ReactNode }>({
      message: '', type: 'success', visible: false
  });

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
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const typingIntervalRef = useRef<any>(null);

  const t = TRANSLATIONS[lang];
  
  // Derived State
  const unreadCount = notifications.filter(n => !n.read).length;

  // Cleanup interval on unmount
  useEffect(() => {
      return () => {
          if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      }
  }, []);

  const showToast = (message: string, type: 'success' | 'notification' = 'success', icon?: React.ReactNode) => {
      setToast({ message, type, visible: true, icon });
      // Play appropriate sound
      playSystemSound(type === 'success' ? 'success' : 'notification');
      
      setTimeout(() => {
          setToast(prev => ({ ...prev, visible: false }));
      }, 3000);
  };

  // External Notification Helper
  const sendExternalNotification = (title: string, body: string) => {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          new Notification(title, { body, icon: '/icon.png' });
      }
  };

  // Data Fetching
  const refreshData = async (specificUser?: User) => {
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
      
      // Resolve avatar/cover URLs
      const processedUsers = await Promise.all(allUsers.map(async (u) => {
           let av = u.avatarUrl;
           let cv = u.coverUrl;
           if (!av.startsWith('http')) { const r = await db.getFileUrl(av); if(r) av = r; }
           if (!cv.startsWith('http')) { const r = await db.getFileUrl(cv); if(r) cv = r; }
           return { ...u, avatarUrl: av, coverUrl: cv };
      }));

      setUsers(processedUsers);
      setNotes(processedNotes);

      const userForNotifs = specificUser || currentUser;
      if (userForNotifs) {
          const notifs = await db.getNotifications(userForNotifs.id);
          setNotifications(notifs);
      }
  };

  // --- Simulate Offline Activity ---
  const simulateOfflineActivity = async (user: User) => {
      // Logic: If user hasn't been here for a while (simulated by just checking if we have < 2 unread), add fake engagement
      const existingUnread = await db.getNotifications(user.id);
      
      if (existingUnread.filter(n => !n.read).length === 0) {
          // Create a fake notification to simulate "While you were away"
          const fakeUser = users.find(u => u.id !== user.id) || users[0]; // Pick someone else
          if (!fakeUser) return;

          const activityType = Math.random() > 0.5 ? 'LIKE' : 'FOLLOW';
          
          const fakeNotif: Notification = {
              id: Date.now().toString(),
              type: activityType as any,
              fromUser: fakeUser,
              noteId: activityType === 'LIKE' ? notes[0]?.id : undefined,
              timestamp: Date.now(),
              read: false
          };

          // We need to bypass normal flow and inject directly to simulate external event
          // Note: In a real app, this comes from backend. Here we append to DB.
          await db.createNotification(fakeNotif);
          
          // Refresh to show the count
          const updatedNotifs = await db.getNotifications(user.id);
          setNotifications(updatedNotifs);
          
          // Show toast on entry for this activity
          const msg = activityType === 'LIKE' ? `${fakeUser.displayName} liked your note` : `${fakeUser.displayName} followed you`;
          setTimeout(() => showToast(msg, 'notification'), 800);
      }
  };

  // --- Initial Load ---
  useEffect(() => {
    const initApp = async () => {
        // Request Notification Permission
        if ('Notification' in window) {
            Notification.requestPermission();
        }

        const userLang = navigator.language.split('-')[0];
        setLang(userLang === 'ar' ? 'ar' : 'en');
        // Force LTR strictly as requested
        document.documentElement.dir = 'ltr';

        // Simulated splash delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if user is already logged in
        const loggedUser = await db.getCurrentUser();
        if (loggedUser) {
            setCurrentUser(loggedUser);
            setScreen(Screen.FEED);
            await refreshData(loggedUser);
            
            // Simulate fetching data that happened while away
            setTimeout(() => simulateOfflineActivity(loggedUser), 1000);

        } else {
            setScreen(Screen.AUTH);
            refreshData();
        }
    };
    
    initApp();
  }, []);

  // --- Periodic Simulation (External Notification) ---
  useEffect(() => {
      // Randomly trigger a "notification" from outside if the app is open but idle
      const interval = setInterval(() => {
          if (currentUser && Math.random() > 0.9) { // Low chance every check
              // Create a visual toast notification to show the Dynamic Island feature
              const msgs = [
                  "Sara liked your poem",
                  "Ahmed started following you",
                  "New trending topic: #Midnight"
              ];
              const msg = msgs[Math.floor(Math.random() * msgs.length)];
              // Only show if we are NOT on notifications screen
              if (screen !== Screen.NOTIFICATIONS) {
                  showToast(msg, 'notification', <Bell size={18} className="text-white"/>);
                  sendExternalNotification("Notos", msg);
              }
          }
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
  }, [currentUser, screen]);


  // Toggle Dark Mode class on HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // Navigation Handlers
  const handleNavigate = async (s: Screen) => {
    // If going to notifications, mark all as read
    if (s === Screen.NOTIFICATIONS && currentUser) {
        // Optimistically update local state
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
        
        // Update DB
        const dbNotifs = await db.getNotifications(currentUser.id);
        dbNotifs.forEach(n => n.read = true);
        localStorage.setItem('notos_notifications', JSON.stringify(await db.getAllNotificationsRaw())); 
    }

    setScreen(s);
    setSettingsView('MAIN'); // Reset settings view
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
    await refreshData(user);
    setScreen(Screen.FEED);
    setTimeout(() => simulateOfflineActivity(user), 1000);
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
            const liked = !n.isLikedByCurrentUser;
            if (liked) {
                 // Trigger Toast for 'Liked'
                 // showToast('Liked', 'success', <Heart size={18} fill="currentColor" className="text-red-500" />);
            }
            return {
                ...n,
                likes: liked ? n.likes + 1 : n.likes - 1,
                isLikedByCurrentUser: liked
            };
        }
        return n;
    }));
  };

  const handleFollowToggle = async (targetUserId: string) => {
      if (!currentUser) return;
      
      const { currentUser: updatedCurrent, targetUser: updatedTarget } = await db.toggleFollow(currentUser.id, targetUserId);
      
      // Check if we followed (added to array)
      if (updatedCurrent.followingIds.includes(targetUserId)) {
          showToast(`Following ${updatedTarget.displayName}`, 'success');
      }

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
    showToast('Comment posted', 'success');
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
    
    // Show Dynamic Island Notification
    showToast('Note Published', 'success');
    
    setScreen(Screen.FEED);
  };

  const handleAISuggestTags = async () => {
    if (!newNoteContent) return;
    setIsPolishing(true);
    
    // Fetch suggestions
    const tags = await suggestTags(newNoteContent);
    
    if (tags.length > 0) {
        const tagsString = "\n\n" + tags.join(' ');
        
        // Typewriter effect: append character by character
        let i = 0;
        // Clear existing
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

        typingIntervalRef.current = setInterval(() => {
            const char = tagsString.charAt(i);
            setNewNoteContent(prev => prev + char);
            i++;
            
            if (i >= tagsString.length) {
                if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
                setIsPolishing(false);
            }
        }, 30); // Speed of typing
    } else {
        setIsPolishing(false);
    }
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
      showToast('Profile Saved', 'success');
    }
  };

  const updateSettings = async (updates: Partial<User>) => {
      if (!currentUser) return;
      const updated = await db.updateUser(currentUser.id, updates);
      setCurrentUser(updated);
      // refreshData(); // Not strictly needed for local UI toggle speed
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
    
    // Mix default trending tags if not enough user tags
    const mixedTags = [...new Set([...topTags, ...DEFAULT_TRENDING_TAGS])].slice(0, 6);
    
    const creators = [...users].filter(u => u.id !== currentUser?.id).slice(0, 3);
    return { topTags: mixedTags, creators };
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
    if (screen === Screen.SPLASH) return <SplashScreen onFinish={() => {}} />; 
    if (screen === Screen.AUTH) return <AuthScreen onLogin={handleLogin} t={t} />;
    
    if (screen === Screen.CREATE) {
        const isDarkBg = activeStyle.color.includes('slate') || activeStyle.color.includes('black') || activeStyle.color.includes('text-white');
        const textColor = isDarkBg ? 'text-white' : 'text-gray-900 dark:text-white';
        const placeholderColor = isDarkBg ? 'placeholder-gray-400' : 'placeholder-gray-300';

        return (
          <div className="relative h-full flex flex-col bg-white dark:bg-black transition-colors duration-300">
            {/* Minimalist Header */}
            <div className="absolute top-6 left-0 right-0 px-6 z-20 flex justify-between items-center">
              <button 
                onClick={() => setScreen(Screen.FEED)} 
                className="p-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors shadow-sm"
              >
                 <X size={20} className="dark:text-white opacity-70"/>
              </button>

              <div className="flex gap-3">
                 <button 
                    onClick={handleAISuggestTags}
                    disabled={isPolishing || !newNoteContent}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full font-bold text-sm text-gray-600 dark:text-gray-300 shadow-sm hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {isPolishing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} fill="currentColor" className="opacity-50"/>}
                    <span>{t.polish}</span>
                 </button>

                 <button 
                    onClick={handleCreateNote}
                    className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-sm shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    disabled={!newNoteContent && !newNoteAudioBlob}
                 >
                    {t.post}
                 </button>
              </div>
            </div>
            
            <div className={`flex-1 flex flex-col ${activeStyle.color} transition-colors duration-500`}>
              {/* Main Text Area - Centered and Large */}
              <div className="relative flex-1 flex items-center">
                <textarea
                  placeholder={t.placeholder}
                  className={`w-full h-full px-8 pt-32 pb-40 bg-transparent resize-none outline-none text-3xl leading-relaxed font-serif placeholder-opacity-40 ${textColor} ${activeStyle.font}`}
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  disabled={isPolishing} 
                />
              </div>

              {/* Audio Preview (Floating if exists) */}
              {newNoteAudioUrl && (
                 <div className="absolute bottom-40 left-6 right-6 p-4 bg-white/20 rounded-2xl border border-black/5 backdrop-blur-md shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-50">{t.voiceNote}</span>
                        <button onClick={() => { setNewNoteAudioBlob(null); setNewNoteAudioUrl(null); setNewNoteDuration(0); }}><X size={14}/></button>
                    </div>
                    <AudioPlayer duration={newNoteDuration} src={newNoteAudioUrl} colorClass={isDarkBg ? 'text-white' : 'text-black'} />
                 </div>
              )}

              {/* Bottom Controls: Toolbar & Colors */}
              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-6 bg-gradient-to-t from-white/10 to-transparent pb-8">
                
                {/* Tools Row: Mic, Icon */}
                {/* Removed Font Change Button */}
                <div className="flex justify-center items-center gap-6">
                     <button 
                        onClick={toggleRecording}
                        className={`p-3 rounded-full transition-all shadow-sm hover:scale-105 active:scale-95
                                   ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-200' : 'bg-white dark:bg-zinc-800 text-black dark:text-white'}`}
                     >
                        <Mic size={22} />
                     </button>

                     <button 
                        onClick={() => setIsIconPickerOpen(true)}
                        className="p-3 rounded-full bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm hover:scale-105 transition-transform"
                     >
                        {(() => {
                            const Icon = AVAILABLE_ICONS.find(i => i.id === activeStyle.icon)?.icon || Star;
                            return <Icon size={22} />;
                        })()}
                     </button>
                </div>

                {/* Color Palette Row (Minimalist Circles) */}
                <div className="flex justify-center gap-4">
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
                       className={`w-8 h-8 rounded-full transition-transform duration-300 shadow-sm
                                  ${style.color.replace('text-white', '')} 
                                  ${activeStyle.color === style.color ? 'scale-125 shadow-md ring-2 ring-offset-2 ring-black dark:ring-white dark:ring-offset-black' : 'opacity-80 hover:opacity-100 hover:scale-110'}`}
                     />
                   ))}
                </div>
              </div>

              {/* Icon Picker Overlay */}
              {isIconPickerOpen && (
                  <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-zinc-900 rounded-t-3xl z-50 p-6 shadow-2xl animate-slide-up border-t border-gray-100 dark:border-zinc-800 h-[400px] flex flex-col">
                      <div className="flex justify-between items-center mb-4 shrink-0">
                        <h3 className="font-bold dark:text-white">Select Icon</h3>
                        <button onClick={() => setIsIconPickerOpen(false)}><X className="dark:text-white"/></button>
                      </div>
                      <div className="grid grid-cols-4 gap-3 overflow-y-auto pb-4 no-scrollbar">
                        {AVAILABLE_ICONS.map((item) => (
                            <button 
                              key={item.id}
                              onClick={() => { setActiveStyle({...activeStyle, icon: item.id}); setIsIconPickerOpen(false); }}
                              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all
                                          ${activeStyle.icon === item.id ? 'bg-black text-white dark:bg-white dark:text-black scale-105 shadow-md' : 'bg-gray-50 dark:bg-zinc-800 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
                            >
                              <item.icon size={24} />
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{item.label}</span>
                            </button>
                        ))}
                      </div>
                  </div>
              )}
            </div>
          </div>
        );
    }

    // --- Common Layout Wrappers ---
    const commonProps = {
        currentScreen: screen,
        onNavigate: handleNavigate,
        unreadCount: unreadCount, // Pass the numeric count
        labels: { home: t.home, discover: t.discover, activity: t.activity, profile: t.profile }
    };

    if (screen === Screen.FEED) {
        const filteredNotes = getFilteredNotes();
        return (
          <Layout {...commonProps}>
             <div className="bg-gray-50 dark:bg-black min-h-full transition-colors duration-300 pt-14">
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
                           className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${activeInterest === interest ? 'bg-black text-white dark:bg-white dark:text-black shadow-md scale-105' : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-zinc-800'}`}
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
            <div className="bg-gray-50 dark:bg-black min-h-full transition-colors duration-300 pt-12">
              <PullRefreshWrapper onRefresh={handleRefresh} isDark={darkMode}>
                <div className="p-4 pb-24">
                    {/* Added explicit margin top to search bar */}
                    <div className="relative mb-6 sticky top-2 z-10 bg-gray-50/90 dark:bg-black/90 backdrop-blur-md pb-2 rounded-b-xl">
                        <input 
                        type="text" 
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 dark:text-white rounded-2xl py-3.5 pl-11 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-shadow"
                        />
                        <div className="absolute top-3.5 left-4 text-gray-400">
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
        const backToMain = () => setSettingsView('MAIN');

        // Render Sub-Views
        if (settingsView === 'PERSONAL' && currentUser) {
            return (
                <Layout {...commonProps}>
                    <div className="min-h-full bg-white dark:bg-black animate-slide-up pt-12">
                        <div className="p-4 flex items-center gap-4 border-b border-gray-100 dark:border-zinc-800">
                            <button onClick={backToMain} className="dark:text-white"><ArrowLeft /></button>
                            <h2 className="text-xl font-bold dark:text-white">{t.personalInfo}</h2>
                        </div>
                        <div className="p-4 space-y-6">
                             <div className="space-y-4">
                                 <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4">
                                     <p className="text-xs text-gray-400 uppercase font-bold mb-1">{t.name}</p>
                                     <p className="text-lg font-medium dark:text-white">{currentUser.displayName}</p>
                                 </div>
                                 <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4">
                                     <p className="text-xs text-gray-400 uppercase font-bold mb-1">{t.username}</p>
                                     <p className="text-lg font-medium dark:text-white">@{currentUser.username}</p>
                                 </div>
                                 <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4">
                                     <p className="text-xs text-gray-400 uppercase font-bold mb-1">{t.email}</p>
                                     <p className="text-lg font-medium dark:text-white">{currentUser.email}</p>
                                 </div>
                                 <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4">
                                     <p className="text-xs text-gray-400 uppercase font-bold mb-1">{t.bio}</p>
                                     <p className="text-base dark:text-white">{currentUser.bio}</p>
                                 </div>
                             </div>
                             <button 
                                onClick={() => { setScreen(Screen.PROFILE); openEditProfile(); }}
                                className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold"
                             >
                                 {t.editProfile}
                             </button>
                        </div>
                    </div>
                </Layout>
            );
        }

        if (settingsView === 'SECURITY' && currentUser) {
            return (
                <Layout {...commonProps}>
                    <div className="min-h-full bg-white dark:bg-black animate-slide-up pt-12">
                        <div className="p-4 flex items-center gap-4 border-b border-gray-100 dark:border-zinc-800">
                            <button onClick={backToMain} className="dark:text-white"><ArrowLeft /></button>
                            <h2 className="text-xl font-bold dark:text-white">{t.security}</h2>
                        </div>
                        <div className="p-4 space-y-6">
                            <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-lg dark:text-white mb-1">{t.privateAccount}</h3>
                                    <p className="text-sm text-gray-500 max-w-[250px] leading-snug">{t.privateDescription}</p>
                                </div>
                                <button 
                                    onClick={() => updateSettings({ isPrivate: !currentUser.isPrivate })}
                                    className={`transition-colors ${currentUser.isPrivate ? 'text-green-500' : 'text-gray-300'}`}
                                >
                                    {currentUser.isPrivate ? <ToggleRight size={48} fill="currentColor" /> : <ToggleLeft size={48} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </Layout>
            );
        }

        if (settingsView === 'NOTIFICATIONS' && currentUser) {
            const toggleNotif = (key: keyof typeof currentUser.notificationSettings) => {
                const newSettings = { ...currentUser.notificationSettings, [key]: !currentUser.notificationSettings[key] };
                updateSettings({ notificationSettings: newSettings });
            };

            return (
                <Layout {...commonProps}>
                    <div className="min-h-full bg-white dark:bg-black animate-slide-up pt-12">
                        <div className="p-4 flex items-center gap-4 border-b border-gray-100 dark:border-zinc-800">
                            <button onClick={backToMain} className="dark:text-white"><ArrowLeft /></button>
                            <h2 className="text-xl font-bold dark:text-white">{t.notifications}</h2>
                        </div>
                        <div className="p-4 space-y-4">
                             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{t.pushNotifications}</h3>
                             
                             {/* Likes - Monochrome Icon */}
                             <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                     <div className="p-2 bg-transparent border border-gray-200 dark:border-zinc-800 text-black dark:text-white rounded-full"><Heart size={18}/></div>
                                     <span className="font-bold dark:text-white">{t.notifyLikes}</span>
                                 </div>
                                 <button onClick={() => toggleNotif('likes')} className={`transition-colors ${currentUser.notificationSettings.likes ? 'text-green-500' : 'text-gray-300'}`}>
                                     {currentUser.notificationSettings.likes ? <ToggleRight size={40} fill="currentColor"/> : <ToggleLeft size={40}/>}
                                 </button>
                             </div>

                             {/* Follows - Monochrome Icon */}
                             <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                     <div className="p-2 bg-transparent border border-gray-200 dark:border-zinc-800 text-black dark:text-white rounded-full"><UserPlus size={18}/></div>
                                     <span className="font-bold dark:text-white">{t.notifyFollows}</span>
                                 </div>
                                 <button onClick={() => toggleNotif('follows')} className={`transition-colors ${currentUser.notificationSettings.follows ? 'text-green-500' : 'text-gray-300'}`}>
                                     {currentUser.notificationSettings.follows ? <ToggleRight size={40} fill="currentColor"/> : <ToggleLeft size={40}/>}
                                 </button>
                             </div>

                             {/* New Posts - Monochrome Icon */}
                             <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-4 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                     <div className="p-2 bg-transparent border border-gray-200 dark:border-zinc-800 text-black dark:text-white rounded-full"><Bell size={18}/></div>
                                     <span className="font-bold dark:text-white">{t.notifyPosts}</span>
                                 </div>
                                 <button onClick={() => toggleNotif('newPosts')} className={`transition-colors ${currentUser.notificationSettings.newPosts ? 'text-green-500' : 'text-gray-300'}`}>
                                     {currentUser.notificationSettings.newPosts ? <ToggleRight size={40} fill="currentColor"/> : <ToggleLeft size={40}/>}
                                 </button>
                             </div>
                        </div>
                    </div>
                </Layout>
            );
        }

        // Main Settings View
        return (
            <Layout {...commonProps}>
                <div className="min-h-full bg-white dark:bg-black animate-slide-up pt-12">
                    <div className="p-4 flex items-center gap-4 border-b border-gray-100 dark:border-zinc-800">
                        <button onClick={() => setScreen(Screen.PROFILE)} className="dark:text-white"><ArrowLeft /></button>
                        <h2 className="text-xl font-bold dark:text-white">{t.settings}</h2>
                    </div>
                    <div className="p-4 space-y-6">
                        <div className="space-y-1">
                             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Account</h3>
                             <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl overflow-hidden">
                                 <button onClick={() => setSettingsView('PERSONAL')} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white transition-colors">
                                     <div className="flex items-center gap-3"><UserIcon size={20}/> {t.personalInfo}</div>
                                     <ChevronRight size={16} className="text-gray-400"/>
                                 </button>
                                 <div className="h-px bg-gray-200 dark:bg-zinc-800 w-full"></div>
                                 <button onClick={() => setSettingsView('SECURITY')} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white transition-colors">
                                     <div className="flex items-center gap-3"><Shield size={20}/> {t.security}</div>
                                     <ChevronRight size={16} className="text-gray-400"/>
                                 </button>
                             </div>
                        </div>

                        <div className="space-y-1">
                             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">App</h3>
                             <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl overflow-hidden">
                                 <button onClick={() => setSettingsView('NOTIFICATIONS')} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white transition-colors">
                                     <div className="flex items-center gap-3"><Bell size={20}/> {t.notifications}</div>
                                     <ChevronRight size={16} className="text-gray-400"/>
                                 </button>
                                 <div className="h-px bg-gray-200 dark:bg-zinc-800 w-full"></div>
                                 <button onClick={toggleTheme} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white transition-colors">
                                     <div className="flex items-center gap-3">{darkMode ? <Sun size={20}/> : <Moon size={20}/>} {t.appearance}</div>
                                     <span className="text-xs text-gray-400">{darkMode ? 'Dark' : 'Light'}</span>
                                 </button>
                                 <div className="h-px bg-gray-200 dark:bg-zinc-800 w-full"></div>
                                 <button className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white transition-colors">
                                     <div className="flex items-center gap-3"><HelpCircle size={20}/> {t.help}</div>
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
                        <div className="text-center text-xs text-gray-300 mt-4">Version 1.0.5</div>
                    </div>
                </div>
            </Layout>
        )
    }

    if (screen === Screen.TAG_DETAILS) {
        const tagNotes = notes.filter(n => n.tags.includes((selectedTag as string) || ''));
        return (
            <Layout {...commonProps}>
                <div className="bg-gray-50 dark:bg-black min-h-full transition-colors duration-300 pt-12">
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
             <div className="bg-gray-50 dark:bg-black min-h-full transition-colors duration-300 pt-14">
               <PullRefreshWrapper onRefresh={handleRefresh} isDark={darkMode}>
                 <div className="p-4 pb-24">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold dark:text-white tracking-tight">{t.activity}</h2>
                        <button 
                            className="text-xs font-bold text-gray-400 hover:text-black dark:hover:text-white"
                            onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                        >
                            Mark all read
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {notifications.map(notif => (
                        <div 
                            key={notif.id} 
                            onClick={() => handleUserClick(notif.fromUser.id)}
                            className={`flex gap-4 items-center p-4 rounded-2xl shadow-sm cursor-pointer border border-gray-50 dark:border-zinc-800 relative overflow-hidden transition-all active:scale-98
                                       ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-white dark:bg-zinc-900'}`}
                        >
                            {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                            
                            {/* Monochrome Notification Icons */}
                            <div className="p-3 rounded-full shrink-0 bg-transparent border border-gray-200 dark:border-zinc-800 text-black dark:text-white">
                                {notif.type === 'LIKE' ? <Heart size={18} fill="currentColor"/> : <UserPlus size={18} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm dark:text-white leading-snug">
                                <span className="font-bold">{notif.fromUser.displayName}</span>
                                {notif.type === 'LIKE' ? ` ${t.liked}` : ` ${t.startedFollowing}`}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 font-medium">Just now</p>
                            </div>
                            {notif.type === 'FOLLOW' && (
                                <button className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-full">Follow</button>
                            )}
                        </div>
                        ))}
                        {notifications.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <Bell size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No new activity.</p>
                            </div>
                        )}
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
                        <div className="absolute top-12 left-4 z-10">
                            {!isSelf && (
                                <button onClick={() => setScreen(Screen.FEED)} className="p-2 bg-white/20 backdrop-blur text-white rounded-full hover:bg-white/30 transition-colors">
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                        </div>
                        <div className="absolute top-12 right-4 z-10 flex gap-2">
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
                <div className="bg-white dark:bg-black min-h-full p-4 transition-colors duration-300 pt-14">
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
        
        {/* Dynamic Island Notification */}
        <DynamicIsland message={toast.message} type={toast.type} visible={toast.visible} icon={toast.icon} />

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
            <div className="absolute inset-0 bg-white dark:bg-black z-[60] animate-slide-up flex flex-col pt-12">
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