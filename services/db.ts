
import { User, Note, Notification, NoteType } from '../types';

// --- Persistent Database Service (IndexedDB + LocalStorage) ---

const DB_KEYS = {
    USERS: 'notos_users',
    NOTES: 'notos_notes',
    NOTIFICATIONS: 'notos_notifications',
    CURRENT_USER_ID: 'notos_current_user_id'
};

// Helper for IndexedDB to store blobs (Audio/Images)
// LocalStorage has a 5MB limit, so we use IDB for media.
const IDB_NAME = 'NotosMediaDB';
const IDB_STORE = 'media';

const openMediaDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, 1);
        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        request.onsuccess = (event: any) => resolve(event.target.result);
        request.onerror = (event) => reject(event);
    });
};

const saveBlob = async (key: string, blob: Blob): Promise<void> => {
    const db = await openMediaDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(blob, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getBlob = async (key: string): Promise<Blob | null> => {
    const db = await openMediaDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
};

// --- Main Service ---

class DatabaseService {
    
    // Helpers
    private load<T>(key: string): T[] {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    private save(key: string, data: any) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // --- Auth ---
    
    async getCurrentUser(): Promise<User | null> {
        const id = localStorage.getItem(DB_KEYS.CURRENT_USER_ID);
        if (!id) return null;
        const users = this.load<User>(DB_KEYS.USERS);
        return users.find(u => u.id === id) || null;
    }

    async login(email: string, username: string): Promise<User> {
        const users = this.load<User>(DB_KEYS.USERS);
        let user = users.find(u => u.email === email);

        if (!user) {
            // Register new user
            user = {
                id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                username: username,
                displayName: username,
                email: email,
                phoneNumber: '',
                avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&fit=crop&q=80',
                coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80',
                followers: 0,
                following: 0,
                followingIds: [],
                bio: 'Just joined Notos.',
                badges: []
            };
            users.push(user);
            this.save(DB_KEYS.USERS, users);
        }
        
        localStorage.setItem(DB_KEYS.CURRENT_USER_ID, user.id);
        return user;
    }

    async logout() {
        localStorage.removeItem(DB_KEYS.CURRENT_USER_ID);
    }

    // --- Users ---

    async getAllUsers(): Promise<User[]> {
        return this.load<User>(DB_KEYS.USERS);
    }

    async updateUser(userId: string, updates: Partial<User>): Promise<User> {
        const users = this.load<User>(DB_KEYS.USERS);
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            this.save(DB_KEYS.USERS, users);
            
            // Also update author info in notes (denormalization simulation)
            const notes = this.load<Note>(DB_KEYS.NOTES);
            let notesChanged = false;
            notes.forEach(n => {
                if (n.userId === userId) {
                    n.author = users[index];
                    notesChanged = true;
                }
            });
            if (notesChanged) this.save(DB_KEYS.NOTES, notes);

            return users[index];
        }
        throw new Error("User not found");
    }

    async toggleFollow(currentUserId: string, targetUserId: string): Promise<{currentUser: User, targetUser: User}> {
        const users = this.load<User>(DB_KEYS.USERS);
        const currentUserIdx = users.findIndex(u => u.id === currentUserId);
        const targetUserIdx = users.findIndex(u => u.id === targetUserId);

        if (currentUserIdx === -1 || targetUserIdx === -1) throw new Error("User not found");

        const currentUser = users[currentUserIdx];
        const targetUser = users[targetUserIdx];

        const isFollowing = currentUser.followingIds.includes(targetUserId);

        if (isFollowing) {
            // Unfollow
            currentUser.followingIds = currentUser.followingIds.filter(id => id !== targetUserId);
            currentUser.following--;
            targetUser.followers--;
        } else {
            // Follow
            currentUser.followingIds.push(targetUserId);
            currentUser.following++;
            targetUser.followers++;

            // Create Notification
            this.createNotification({
                id: `not_${Date.now()}`,
                type: 'FOLLOW',
                fromUser: currentUser,
                timestamp: Date.now(),
                read: false
            });
        }

        users[currentUserIdx] = currentUser;
        users[targetUserIdx] = targetUser;
        this.save(DB_KEYS.USERS, users);

        return { currentUser, targetUser };
    }

    // --- Notes ---

    async getNotes(): Promise<Note[]> {
        return this.load<Note>(DB_KEYS.NOTES).sort((a, b) => b.timestamp - a.timestamp);
    }

    async createNote(note: Note): Promise<Note> {
        const notes = this.load<Note>(DB_KEYS.NOTES);
        notes.unshift(note);
        this.save(DB_KEYS.NOTES, notes);
        return note;
    }

    async toggleLike(noteId: string, userId: string): Promise<Note> {
        const notes = this.load<Note>(DB_KEYS.NOTES);
        const noteIndex = notes.findIndex(n => n.id === noteId);
        
        if (noteIndex === -1) throw new Error("Note not found");
        
        const note = notes[noteIndex];
        const alreadyLiked = note.isLikedByCurrentUser; // Simplified for single user demo

        if (alreadyLiked) {
            note.likes--;
            note.isLikedByCurrentUser = false;
        } else {
            note.likes++;
            note.isLikedByCurrentUser = true;
            
            // Notify author
            const currentUser = await this.getCurrentUser();
            if (currentUser && currentUser.id !== note.userId) {
                this.createNotification({
                    id: `not_${Date.now()}`,
                    type: 'LIKE',
                    fromUser: currentUser,
                    noteId: note.id,
                    timestamp: Date.now(),
                    read: false
                });
            }
        }

        notes[noteIndex] = note;
        this.save(DB_KEYS.NOTES, notes);
        return note;
    }

    async addComment(noteId: string, comment: any): Promise<Note> {
        const notes = this.load<Note>(DB_KEYS.NOTES);
        const noteIndex = notes.findIndex(n => n.id === noteId);
        if (noteIndex !== -1) {
            notes[noteIndex].comments.push(comment);
            this.save(DB_KEYS.NOTES, notes);
            return notes[noteIndex];
        }
        throw new Error("Note not found");
    }

    // --- Notifications ---

    async getNotifications(userId: string): Promise<Notification[]> {
        // In a real app, filter by "toUserId". Since we store simple objects, we'll mock fetching all
        // and just returning them. (For this demo, everyone sees all relevant notifications)
        return this.load<Notification>(DB_KEYS.NOTIFICATIONS).sort((a, b) => b.timestamp - a.timestamp);
    }

    async createNotification(notif: Notification) {
        const list = this.load<Notification>(DB_KEYS.NOTIFICATIONS);
        list.unshift(notif);
        this.save(DB_KEYS.NOTIFICATIONS, list);
    }

    // --- Storage (Files) ---

    async uploadFile(file: Blob | File): Promise<string> {
        const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await saveBlob(id, file);
        return id; // Return ID as URL key
    }

    async getFileUrl(fileId: string): Promise<string | null> {
        // If it's an external URL (http...), return it
        if (fileId.startsWith('http')) return fileId;
        
        const blob = await getBlob(fileId);
        if (blob) {
            return URL.createObjectURL(blob);
        }
        return null;
    }
}

export const db = new DatabaseService();
