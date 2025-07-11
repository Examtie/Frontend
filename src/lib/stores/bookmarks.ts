import { writable, get } from 'svelte/store';
import { auth } from './auth';

export interface Bookmark {
    id: string;
    user_id: string;
    exam_id: string;
    created_at: string;
}

interface BookmarkState {
    bookmarks: Bookmark[];
    loading: boolean;
    error: string | null;
    lastUpdate: number; // Add timestamp for cache invalidation
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const initialState: BookmarkState = {
    bookmarks: [],
    loading: false,
    error: null,
    lastUpdate: 0
};

const { subscribe, set, update } = writable<BookmarkState>(initialState);

async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<any> {
    const authState = get(auth);
    const token = authState.token;
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Request failed' })) as any;
        throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

export const bookmarkStore = {
    subscribe,
    
    // Load all bookmarks with force reload option
    loadBookmarks: async (forceReload = false) => {
        const currentState = get(bookmarkStore);
        const now = Date.now();
        
        // Skip loading if we have recent data and not forcing reload
        if (!forceReload && currentState.bookmarks.length > 0 && 
            (now - currentState.lastUpdate) < 30000) { // 30 seconds cache
            return;
        }
        
        update(state => ({ ...state, loading: true, error: null }));
        
        try {
            const bookmarks = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/bookmarks`);
            update(state => ({ 
                ...state, 
                bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
                loading: false,
                lastUpdate: now
            }));
        } catch (err: any) {
            console.warn('Failed to load bookmarks:', err.message);
            update(state => ({ 
                ...state, 
                bookmarks: [],
                loading: false,
                error: err.message,
                lastUpdate: now
            }));
        }
    },

    // Add a bookmark with optimistic updates
    addBookmark: async (examId: string) => {
        // Optimistic update
        const tempBookmark: Bookmark = {
            id: `temp-${Date.now()}`,
            user_id: '',
            exam_id: examId,
            created_at: new Date().toISOString()
        };
        
        update(state => ({ 
            ...state, 
            bookmarks: [...state.bookmarks, tempBookmark],
            error: null 
        }));
        
        try {
            const newBookmark = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/bookmarks`, {
                method: 'POST',
                body: JSON.stringify({ exam_id: examId }),
            });
            
            // Replace temp bookmark with real one
            update(state => ({ 
                ...state, 
                bookmarks: state.bookmarks.map(b => 
                    b.id === tempBookmark.id ? newBookmark : b
                ),
                lastUpdate: Date.now()
            }));
            
            // Notify other tabs/components about the change
            window.dispatchEvent(new CustomEvent('bookmarkChanged', { 
                detail: { action: 'added', examId, bookmark: newBookmark } 
            }));
            
            // Sync across tabs
            bookmarkStore.syncAcrossTabs('added', examId);
            
            return newBookmark;
        } catch (err: any) {
            // Handle specific error cases
            let errorMessage = err.message;
            if (err.message.includes('Already bookmarked')) {
                errorMessage = 'This exam is already bookmarked';
            } else if (err.message.includes('No authentication')) {
                errorMessage = 'Please log in to bookmark exams';
            }
            
            // Remove temp bookmark on error
            update(state => ({ 
                ...state, 
                bookmarks: state.bookmarks.filter(b => b.id !== tempBookmark.id),
                error: errorMessage 
            }));
            throw new Error(errorMessage);
        }
    },

    // Remove a bookmark with optimistic updates
    removeBookmark: async (examId: string) => {
        const currentState = get(bookmarkStore);
        const bookmarkToRemove = currentState.bookmarks.find(b => b.exam_id === examId);
        
        if (!bookmarkToRemove) {
            throw new Error('Bookmark not found');
        }
        
        // Optimistic update
        update(state => ({ 
            ...state, 
            bookmarks: state.bookmarks.filter(b => b.exam_id !== examId),
            error: null 
        }));
        
        try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/bookmarks/${examId}`, {
                method: 'DELETE',
            });
            
            update(state => ({ 
                ...state, 
                lastUpdate: Date.now()
            }));
            
            // Notify other tabs/components about the change
            window.dispatchEvent(new CustomEvent('bookmarkChanged', { 
                detail: { action: 'removed', examId } 
            }));
            
            // Sync across tabs
            bookmarkStore.syncAcrossTabs('removed', examId);
        } catch (err: any) {
            // Handle specific error cases  
            let errorMessage = err.message;
            if (err.message.includes('Bookmark not found')) {
                errorMessage = 'Bookmark was already removed';
            } else if (err.message.includes('No authentication')) {
                errorMessage = 'Please log in to manage bookmarks';
            }
            
            // Restore bookmark on error
            update(state => ({ 
                ...state, 
                bookmarks: [...state.bookmarks, bookmarkToRemove],
                error: errorMessage 
            }));
            throw new Error(errorMessage);
        }
    },

    // Toggle bookmark (add if not bookmarked, remove if bookmarked)
    toggleBookmark: async (examId: string) => {
        const state = get(bookmarkStore);
        const isBookmarked = state.bookmarks.some(b => b.exam_id === examId);
        
        if (isBookmarked) {
            await bookmarkStore.removeBookmark(examId);
            return { action: 'removed', isBookmarked: false };
        } else {
            await bookmarkStore.addBookmark(examId);
            return { action: 'added', isBookmarked: true };
        }
    },

    // Check if an exam is bookmarked
    isBookmarked: (examId: string): boolean => {
        const state = get(bookmarkStore);
        return state.bookmarks.some(b => b.exam_id === examId);
    },

    // Force refresh bookmarks
    refresh: async () => {
        await bookmarkStore.loadBookmarks(true);
    },

    // Clear all bookmarks (for logout)
    clear: () => {
        set(initialState);
    },

    // Clear error
    clearError: () => {
        update(state => ({ ...state, error: null }));
    },

    // Listen for external bookmark changes (from other tabs)
    listenForChanges: () => {
        const handleBookmarkChange = (event: CustomEvent) => {
            const { action, examId, bookmark } = event.detail;
            
            update(state => {
                if (action === 'added' && bookmark) {
                    // Only add if not already present
                    if (!state.bookmarks.some(b => b.exam_id === examId)) {
                        return {
                            ...state,
                            bookmarks: [...state.bookmarks, bookmark],
                            lastUpdate: Date.now()
                        };
                    }
                } else if (action === 'removed') {
                    return {
                        ...state,
                        bookmarks: state.bookmarks.filter(b => b.exam_id !== examId),
                        lastUpdate: Date.now()
                    };
                }
                return state;
            });
        };

        // Listen for storage changes (cross-tab communication)
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'bookmarkSync' && event.newValue) {
                try {
                    const syncData = JSON.parse(event.newValue);
                    if (syncData.timestamp > get(bookmarkStore).lastUpdate) {
                        // Refresh bookmarks if we detect changes from another tab
                        bookmarkStore.loadBookmarks(true);
                    }
                } catch (error) {
                    console.warn('Failed to parse bookmark sync data:', error);
                }
            }
        };

        window.addEventListener('bookmarkChanged', handleBookmarkChange as EventListener);
        window.addEventListener('storage', handleStorageChange);
        
        // Return cleanup function
        return () => {
            window.removeEventListener('bookmarkChanged', handleBookmarkChange as EventListener);
            window.removeEventListener('storage', handleStorageChange);
        };
    },

    // Sync bookmark changes across tabs
    syncAcrossTabs: (action: 'added' | 'removed', examId: string) => {
        if (typeof window !== 'undefined') {
            const syncData = {
                action,
                examId,
                timestamp: Date.now()
            };
            localStorage.setItem('bookmarkSync', JSON.stringify(syncData));
            // Remove the sync data immediately to trigger storage event
            setTimeout(() => localStorage.removeItem('bookmarkSync'), 100);
        }
    }
};

// Auto-load bookmarks when user is authenticated
auth.subscribe((authState) => {
    if (authState.isAuthenticated && authState.token) {
        // Only load if we don't have bookmarks yet
        const currentState = get(bookmarkStore);
        if (currentState.bookmarks.length === 0 && !currentState.loading) {
            bookmarkStore.loadBookmarks();
        }
    } else {
        // Clear bookmarks when user logs out
        bookmarkStore.clear();
    }
});

// Auto-setup change listeners in browser environment
if (typeof window !== 'undefined') {
    let cleanup: (() => void) | null = null;
    
    auth.subscribe((authState) => {
        if (authState.isAuthenticated && !cleanup) {
            // Start listening for changes when authenticated
            cleanup = bookmarkStore.listenForChanges();
        } else if (!authState.isAuthenticated && cleanup) {
            // Stop listening when logged out
            cleanup();
            cleanup = null;
        }
    });
}
