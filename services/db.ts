
import { User, Note, Notification, NoteType, Comment } from '../types';

// --- IndexedDB Helper for Binary Data (Audio/Images) ---
const DB_NAME = 'NotosDB';
const DB_VERSION = 1;
const STORE_FILES = 'files';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_FILES)) {
                db.createObjectStore(STORE_FILES);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveFile = async (id: string, file: Blob): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        const store = tx.objectStore(STORE_FILES);
        store.put(file, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getFile = async (id: string): Promise<Blob | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const store = tx.objectStore(STORE_FILES);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

// --- LocalStorage Service for Metadata ---

class DatabaseService {
    private STORAGE_KEYS = {
        USERS: 'notos_users',
        NOTES: 'notos_notes',
        CURRENT_USER_ID: 'notos_current_user_id',
        NOTIFICATIONS: 'notos_notifications',
        FOLLOWS: 'notos_follows'
    };

    // --- Auth ---
    
    async getCurrentUser(): Promise<User | null> {
        const id = localStorage.getItem(this.STORAGE_KEYS.CURRENT_USER_ID);
        if (!id) return null;
        const users = this.getUsersFromStorage();
        return users.find(u => u.id === id) || null;
    }

    async login(email: string, username: string): Promise<User> {
        const users = this.getUsersFromStorage();
        let user = users.find(u => u.email === email);

        if (!user) {
            user = {
                id: Date.now().toString(),
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
                notificationSettings: {
                    likes: true,
                    follows: true,
                    newPosts: true
                }
            };
            users.push(user);
            this.saveUsersToStorage(users);
        }

        localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER_ID, user.id);
        return user;
    }

    async logout() {
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER_ID);
    }

    async getAllUsers(): Promise<User[]> {
        return this.getUsersFromStorage();
    }

    async updateUser(userId: string, updates: Partial<User>): Promise<User> {
        const users = this.getUsersFromStorage();
        const index = users.findIndex(u => u.id === userId);
        if (index === -1) throw new Error("User not found");

        users[index] = { ...users[index], ...updates };
        this.saveUsersToStorage(users);
        return users[index];
    }

    // --- Follows ---
    
    async toggleFollow(currentUserId: string, targetUserId: string): Promise<{currentUser: User, targetUser: User}> {
        const users = this.getUsersFromStorage();
        const cIndex = users.findIndex(u => u.id === currentUserId);
        const tIndex = users.findIndex(u => u.id === targetUserId);

        if (cIndex === -1 || tIndex === -1) throw new Error("User not found");

        const currentUser = users[cIndex];
        const targetUser = users[tIndex];

        const isFollowing = currentUser.followingIds.includes(targetUserId);

        if (isFollowing) {
            currentUser.followingIds = currentUser.followingIds.filter(id => id !== targetUserId);
            currentUser.following -= 1;
            targetUser.followers -= 1;
        } else {
            currentUser.followingIds.push(targetUserId);
            currentUser.following += 1;
            targetUser.followers += 1;
            
            await this.createNotification({
                id: Date.now().toString(),
                type: 'FOLLOW',
                fromUser: currentUser,
                toUserId: targetUserId,
                timestamp: Date.now(),
                read: false
            });
        }

        this.saveUsersToStorage(users);
        return { currentUser, targetUser };
    }

    // --- Notes ---

    async getNotes(): Promise<Note[]> {
        return this.getNotesFromStorage().sort((a, b) => b.timestamp - a.timestamp);
    }

    async createNote(note: Note): Promise<Note> {
        // Simulate Network Delay
        await new Promise(r => setTimeout(r, 500));
        
        const notes = this.getNotesFromStorage();
        notes.unshift(note);
        this.saveNotesToStorage(notes);
        return note;
    }

    async toggleLike(noteId: string, userId: string): Promise<void> {
        const notes = this.getNotesFromStorage();
        const note = notes.find(n => n.id === noteId);
        if (note) {
            if (note.isLikedByCurrentUser) {
                note.likes -= 1;
                note.isLikedByCurrentUser = false;
            } else {
                note.likes += 1;
                note.isLikedByCurrentUser = true;
                
                if (note.userId !== userId) {
                    const currentUser = await this.getCurrentUser();
                    if (currentUser) {
                        await this.createNotification({
                            id: Date.now().toString(),
                            type: 'LIKE',
                            fromUser: currentUser,
                            toUserId: note.userId,
                            noteId: note.id,
                            timestamp: Date.now(),
                            read: false
                        });
                    }
                }
            }
            this.saveNotesToStorage(notes);
        }
    }

    async addComment(noteId: string, comment: Comment): Promise<void> {
        const notes = this.getNotesFromStorage();
        const note = notes.find(n => n.id === noteId);
        if (note) {
            note.comments.push(comment);
            this.saveNotesToStorage(notes);
        }
    }

    // --- Notifications ---

    async getNotifications(userId: string): Promise<Notification[]> {
        const notifs = this.getNotificationsFromStorage();
        return notifs.filter((n: any) => n.toUserId === userId);
    }
    
    async getAllNotificationsRaw(): Promise<any[]> {
        return this.getNotificationsFromStorage();
    }

    async createNotification(notif: any) {
        const notifs = this.getNotificationsFromStorage();
        notifs.unshift({ ...notif, toUserId: notif.toUserId }); // Store target ID
        localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    }

    // --- Files (IndexedDB) ---

    async uploadFile(file: Blob | File): Promise<string> {
        const id = `file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await saveFile(id, file);
        return id; // Return ID, App.tsx will resolve it
    }

    async getFileUrl(id: string): Promise<string | null> {
        if (id.startsWith('http') || id.startsWith('blob:')) return id;
        
        const blob = await getFile(id);
        if (blob) {
            return URL.createObjectURL(blob);
        }
        return null;
    }

    // --- Helpers ---

    private getUsersFromStorage(): User[] {
        const raw = localStorage.getItem(this.STORAGE_KEYS.USERS);
        return raw ? JSON.parse(raw) : [];
    }

    private saveUsersToStorage(users: User[]) {
        localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    private getNotesFromStorage(): Note[] {
        const raw = localStorage.getItem(this.STORAGE_KEYS.NOTES);
        return raw ? JSON.parse(raw) : [];
    }

    private saveNotesToStorage(notes: Note[]) {
        localStorage.setItem(this.STORAGE_KEYS.NOTES, JSON.stringify(notes));
    }

    private getNotificationsFromStorage(): any[] {
        const raw = localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS);
        return raw ? JSON.parse(raw) : [];
    }
}

export const db = new DatabaseService();
