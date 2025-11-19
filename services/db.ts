
import { User, Note, Notification, NoteType, Comment, NoteColor, FontStyle } from '../types';

// --- Seed Data for "Offline" Mode ---
const SEED_USERS: User[] = [
  {
    id: 'user_1',
    username: 'poet_soul',
    displayName: 'Layla Ahmed',
    email: 'layla@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=800&q=80',
    followers: 1240,
    following: 45,
    followingIds: [],
    bio: 'Weaving words into silence. 🌙',
    badges: ['verified'],
    isPrivate: false,
    notificationSettings: { likes: true, follows: true, newPosts: true }
  },
  {
    id: 'user_2',
    username: 'wanderer',
    displayName: 'Omar',
    email: 'omar@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
    followers: 890,
    following: 120,
    followingIds: [],
    bio: 'Photography & Poetry.',
    badges: [],
    isPrivate: false,
    notificationSettings: { likes: true, follows: true, newPosts: true }
  }
];

const SEED_NOTES: Note[] = [
  {
    id: 'note_1',
    userId: 'user_1',
    author: SEED_USERS[0],
    content: "The moon is a loyal companion.\nIt never leaves. It's always there, watching, steadfast, knowing us in our light and dark moments, changing forever just as we do.\n\n#Moon #Night #Poetry",
    type: NoteType.TEXT,
    timestamp: Date.now() - 3600000, // 1 hour ago
    likes: 45,
    isLikedByCurrentUser: false,
    likedBy: [],
    comments: [],
    style: { font: FontStyle.SERIF, color: NoteColor.DARK, icon: 'Moon' },
    tags: ['#Moon', '#Night', '#Poetry']
  },
  {
    id: 'note_2',
    userId: 'user_2',
    author: SEED_USERS[1],
    content: "Just captured the sunrise. There is something magical about the beginning of things. #Sunrise #Hope",
    type: NoteType.TEXT,
    timestamp: Date.now() - 7200000,
    likes: 128,
    isLikedByCurrentUser: false,
    likedBy: [],
    comments: [],
    style: { font: FontStyle.SANS, color: NoteColor.YELLOW, icon: 'Sun' },
    tags: ['#Sunrise', '#Hope']
  }
];

class DatabaseService {
    private users: User[] = [];
    private notes: Note[] = [];
    private notifications: Notification[] = [];
    private storageKey = 'notos_local_db_v1';

    constructor() {
        this.loadData();
    }

    private loadData() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            const data = JSON.parse(stored);
            this.users = data.users || SEED_USERS;
            this.notes = data.notes || SEED_NOTES;
            this.notifications = data.notifications || [];
        } else {
            this.users = [...SEED_USERS];
            this.notes = [...SEED_NOTES];
            this.notifications = [];
            this.saveData();
        }
    }

    private saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify({
            users: this.users,
            notes: this.notes,
            notifications: this.notifications
        }));
    }

    private async simulateDelay() {
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms fake network delay
    }

    // --- Auth ---
    
    async getCurrentUser(): Promise<User | null> {
        const id = localStorage.getItem('notos_current_user_id');
        if (!id) return null;
        return this.users.find(u => u.id === id) || null;
    }

    async login(email: string, username: string): Promise<User> {
        await this.simulateDelay();
        
        let user = this.users.find(u => u.email === email || u.username === username);
        
        if (!user) {
            user = {
                id: 'user_' + Date.now(),
                username,
                displayName: username,
                email,
                avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&fit=crop&q=80',
                coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80',
                followers: 0,
                following: 0,
                followingIds: [],
                bio: 'Just joined Notos.',
                badges: [],
                isPrivate: false,
                notificationSettings: { likes: true, follows: true, newPosts: true }
            };
            this.users.push(user);
            this.saveData();
        }

        localStorage.setItem('notos_current_user_id', user.id);
        return user;
    }

    async logout() {
        localStorage.removeItem('notos_current_user_id');
    }

    async getAllUsers(): Promise<User[]> {
        await this.simulateDelay();
        return [...this.users];
    }

    async updateUser(userId: string, updates: Partial<User>): Promise<User> {
        await this.simulateDelay();
        const idx = this.users.findIndex(u => u.id === userId);
        if (idx === -1) throw new Error("User not found");
        
        this.users[idx] = { ...this.users[idx], ...updates };
        
        // Update author info in notes
        this.notes = this.notes.map(n => {
            if (n.userId === userId) {
                return { ...n, author: this.users[idx] };
            }
            return n;
        });

        this.saveData();
        return this.users[idx];
    }

    // --- Follows ---
    
    async toggleFollow(currentUserId: string, targetUserId: string): Promise<{currentUser: User, targetUser: User}> {
        await this.simulateDelay();
        const userIdx = this.users.findIndex(u => u.id === currentUserId);
        const targetIdx = this.users.findIndex(u => u.id === targetUserId);

        if (userIdx === -1 || targetIdx === -1) throw new Error("User not found");

        const isFollowing = this.users[userIdx].followingIds.includes(targetUserId);

        if (isFollowing) {
            this.users[userIdx].followingIds = this.users[userIdx].followingIds.filter(id => id !== targetUserId);
            this.users[userIdx].following -= 1;
            this.users[targetIdx].followers -= 1;
        } else {
            this.users[userIdx].followingIds.push(targetUserId);
            this.users[userIdx].following += 1;
            this.users[targetIdx].followers += 1;

             await this.createNotification({
                id: Date.now().toString(),
                type: 'FOLLOW',
                fromUser: this.users[userIdx],
                toUserId: targetUserId,
                timestamp: Date.now(),
                read: false
            });
        }

        this.saveData();
        return { currentUser: this.users[userIdx], targetUser: this.users[targetIdx] };
    }

    // --- Notes ---

    async getNotes(): Promise<Note[]> {
        await this.simulateDelay();
        return [...this.notes].sort((a, b) => b.timestamp - a.timestamp);
    }

    async createNote(note: Note): Promise<Note> {
        await this.simulateDelay();
        const safeNote = { ...note };
        this.notes.unshift(safeNote); // Add to top
        this.saveData();
        return safeNote;
    }

    async toggleLike(noteId: string, userId: string): Promise<void> {
        const idx = this.notes.findIndex(n => n.id === noteId);
        if (idx === -1) return;

        const note = this.notes[idx];
        const likedBy = note.likedBy || [];
        const hasLiked = likedBy.includes(userId);

        if (hasLiked) {
            note.likes -= 1;
            note.likedBy = likedBy.filter(id => id !== userId);
        } else {
            note.likes += 1;
            note.likedBy = [...likedBy, userId];

            if (note.userId !== userId) {
                const fromUser = this.users.find(u => u.id === userId);
                if (fromUser) {
                    await this.createNotification({
                        id: Date.now().toString(),
                        type: 'LIKE',
                        fromUser: fromUser,
                        toUserId: note.userId,
                        noteId: note.id,
                        timestamp: Date.now(),
                        read: false
                    });
                }
            }
        }
        
        this.notes[idx] = note;
        this.saveData();
    }

    async toggleCommentLike(noteId: string, commentId: string, userId: string): Promise<void> {
        const idx = this.notes.findIndex(n => n.id === noteId);
        if (idx === -1) return;

        const note = this.notes[idx];
        const commentIdx = note.comments.findIndex(c => c.id === commentId);
        if (commentIdx === -1) return;

        const comment = note.comments[commentIdx];
        const likedBy = comment.likedBy || [];
        const hasLiked = likedBy.includes(userId);

        if (hasLiked) {
            comment.likes = Math.max(0, (comment.likes || 0) - 1);
            comment.likedBy = likedBy.filter(id => id !== userId);
        } else {
            comment.likes = (comment.likes || 0) + 1;
            comment.likedBy = [...likedBy, userId];
        }

        note.comments[commentIdx] = comment;
        this.saveData();
    }

    async addComment(noteId: string, comment: Comment): Promise<void> {
        await this.simulateDelay();
        const idx = this.notes.findIndex(n => n.id === noteId);
        if (idx > -1) {
            this.notes[idx].comments.push(comment);
            this.saveData();
        }
    }

    // --- Notifications ---

    async getNotifications(userId: string): Promise<Notification[]> {
        return this.notifications
            .filter(n => n.toUserId === userId)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    async createNotification(notif: Notification) {
        this.notifications.unshift(notif);
        this.saveData();
    }

    // --- Files (Mock) ---

    async uploadFile(file: Blob | File): Promise<string> {
        await this.simulateDelay();
        // In a real local-only app, we can't persistently store Blobs easily without IndexedDB.
        // For this demo, we use createObjectURL which works for the current session.
        // Or we could convert to Base64 string to save in localStorage (limited size).
        return URL.createObjectURL(file);
    }
}

export const db = new DatabaseService();
