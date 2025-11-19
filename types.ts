
export enum NoteType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO'
}

export enum FontStyle {
  SANS = 'font-sans',
  SERIF = 'font-serif',
  MONO = 'font-mono',
  HAND = 'font-hand'
}

export enum NoteColor {
  WHITE = 'bg-white dark:bg-zinc-900',
  YELLOW = 'bg-yellow-100 dark:bg-yellow-900/30',
  BLUE = 'bg-blue-100 dark:bg-blue-900/30',
  ROSE = 'bg-rose-100 dark:bg-rose-900/30',
  EMERALD = 'bg-emerald-100 dark:bg-emerald-900/30',
  VIOLET = 'bg-violet-100 dark:bg-violet-900/30',
  DARK = 'bg-slate-800 dark:bg-black'
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string; 
  phoneNumber?: string;
  lastUsernameChange?: number; // Timestamp
  avatarUrl: string;
  coverUrl: string;
  followers: number;
  following: number;
  followingIds: string[]; // IDs of users this user follows
  bio: string;
  badges: string[];
}

export interface Note {
  id: string;
  userId: string;
  author: User;
  content: string;
  audioUrl?: string;
  audioDuration?: number; // in seconds
  type: NoteType;
  timestamp: number;
  likes: number;
  isLikedByCurrentUser: boolean;
  comments: Comment[];
  style: {
    font: FontStyle;
    color: NoteColor;
    icon?: string;
  };
  tags: string[];
}

export interface Notification {
  id: string;
  type: 'LIKE' | 'FOLLOW' | 'MENTION';
  fromUser: User;
  noteId?: string;
  timestamp: number;
  read: boolean;
}

export enum Screen {
  SPLASH = 'SPLASH',
  AUTH = 'AUTH',
  FEED = 'FEED',
  DISCOVER = 'DISCOVER',
  CREATE = 'CREATE',
  NOTIFICATIONS = 'NOTIFICATIONS',
  PROFILE = 'PROFILE',
  USER_PROFILE = 'USER_PROFILE', // Viewing another user
  FOLLOW_LIST = 'FOLLOW_LIST',
  TAG_DETAILS = 'TAG_DETAILS',
  SETTINGS = 'SETTINGS'
}