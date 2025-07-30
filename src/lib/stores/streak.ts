import { writable, get } from 'svelte/store';
import { auth } from './auth';

export interface StreakData {
    current: number;
    revives_used: number;
}

interface StreakState {
    streak: StreakData | null;
    loading: boolean;
    error: string | null;
    lastUpdate: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const initialState: StreakState = {
    streak: null,
    loading: false,
    error: null,
    lastUpdate: 0
};

const { subscribe, set, update } = writable<StreakState>(initialState);

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

export const streakStore = {
    subscribe,
    
    // Load streak data with cache
    loadStreak: async (forceReload = false) => {
        const authState = get(auth);
        if (!authState.isAuthenticated || !authState.token) {
            return;
        }

        const currentState = get(streakStore);
        const now = Date.now();
        
        // Skip loading if we have recent data and not forcing reload
        if (!forceReload && currentState.streak && 
            (now - currentState.lastUpdate) < 60000) { // 1 minute cache
            return;
        }
        
        update(state => ({ ...state, loading: true, error: null }));
        
        try {
            const streakData = await makeAuthenticatedRequest(`${API_BASE_URL}/user/api/v1/streak`);
            update(state => ({ 
                ...state, 
                streak: streakData,
                loading: false, 
                error: null,
                lastUpdate: now
            }));
        } catch (err: any) {
            console.error('Error loading streak:', err);
            update(state => ({ 
                ...state, 
                loading: false, 
                error: err.message,
                lastUpdate: now
            }));
        }
    },
    
    // Refresh streak data
    refresh: async () => {
        await streakStore.loadStreak(true);
    },
    
    // Clear streak data (on logout)
    clear: () => {
        set(initialState);
    },
    
    // Clear error
    clearError: () => {
        update(state => ({ ...state, error: null }));
    }
};

// Auto-refresh when coming back online or focusing window
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        const authState = get(auth);
        if (authState.isAuthenticated) {
            streakStore.refresh();
        }
    });
    
    window.addEventListener('focus', () => {
        const authState = get(auth);
        if (authState.isAuthenticated) {
            streakStore.refresh();
        }
    });
    
    // Clear streak data when user logs out
    window.addEventListener('auth:logout', () => {
        streakStore.clear();
    });
    
    // Also subscribe to auth changes as backup
    auth.subscribe((authState) => {
        if (!authState.isAuthenticated) {
            streakStore.clear();
        }
    });
}
