import { writable, get } from 'svelte/store';

export interface User {
  id: string | null;
  email: string;
  full_name: string;
  username: string;
  roles: string[];
  bio: string | null;
  profile_image: string | null;
  token?: string; // Token might not always be present on user object from API, but useful here
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  error: string | null; // For storing API error messages
  tokenExpiresAt: Date | null; // When the token expires
  isTokenExpiringSoon: boolean; // If token expires within 24 hours
  isInitialized: boolean; // Track if auth has finished initializing
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://examtieapi.breadtm.xyz';

// Token storage interface for better management
interface TokenStorage {
  token: string;
  expires_at: number;
  created_at: number;
}

// Enhanced token storage functions
function saveToken(token: string, expiresInMinutes: number = 43200) { // 30 days default
  if (typeof window !== 'undefined') {
    const now = Date.now();
    const tokenData: TokenStorage = {
      token,
      expires_at: now + (expiresInMinutes * 60 * 1000),
      created_at: now
    };
    localStorage.setItem('authTokenData', JSON.stringify(tokenData));
    // Also keep the simple token for backward compatibility
    localStorage.setItem('authToken', token);
  }
}

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const tokenDataStr = localStorage.getItem('authTokenData');
      if (tokenDataStr) {
        const tokenData: TokenStorage = JSON.parse(tokenDataStr);
        const now = Date.now();
        
        // Check if token is expired
        if (tokenData.expires_at && now > tokenData.expires_at) {
          // Token expired, clear it
          clearToken();
          return null;
        }
        
        return tokenData.token;
      }
      
      // Fallback to simple token storage for backward compatibility
      return localStorage.getItem('authToken');
    } catch (error) {
      console.error('Error parsing token data:', error);
      // Clear corrupted data and fallback
      localStorage.removeItem('authTokenData');
      return localStorage.getItem('authToken');
    }
  }
  return null;
}

function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authTokenData');
    localStorage.removeItem('authToken');
  }
}

function getTokenInfo(): { token: string; isExpiringSoon: boolean; expiresAt: Date | null } | null {
  if (typeof window !== 'undefined') {
    try {
      const tokenDataStr = localStorage.getItem('authTokenData');
      if (tokenDataStr) {
        const tokenData: TokenStorage = JSON.parse(tokenDataStr);
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        return {
          token: tokenData.token,
          isExpiringSoon: !!(tokenData.expires_at && (tokenData.expires_at - now) < oneDayMs),
          expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at) : null
        };
      }
    } catch (error) {
      console.error('Error getting token info:', error);
    }
  }
  return null;
}

// Helper functions for localStorage role management
function saveUserRoles(userId: string, roles: string[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`userRoles_${userId}`, JSON.stringify(roles));
  }
}

function getSavedUserRoles(userId: string): string[] | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(`userRoles_${userId}`);
    return saved ? JSON.parse(saved) : null;
  }
  return null;
}

function clearSavedUserRoles(userId: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`userRoles_${userId}`);
  }
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  error: null,
  tokenExpiresAt: null,
  isTokenExpiringSoon: false,
  isInitialized: false,
};

const { subscribe, set, update } = writable<AuthState>(initialAuthState);

async function fetchUserProfile(token: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/api/v1/@me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json() as any;
      throw new Error(errorData.detail || 'Failed to fetch user profile');
    }
    const userData = await response.json() as User;
    
    // Check if we have saved roles for this user
    let savedRoles: string[] | null = null;
    if (userData.id) {
      savedRoles = getSavedUserRoles(userData.id);
    }
    
    // Use backend roles if they exist and are different from saved ones, otherwise use saved roles
    if (userData.roles && userData.roles.length > 0) {
      // Backend provided roles - save them and use them
      if (userData.id) {
        saveUserRoles(userData.id, userData.roles);
      }
    } else if (savedRoles) {
      // No roles from backend but we have saved ones - use saved roles
      userData.roles = savedRoles;
    }
    
    return userData;
  } catch (err: any) {
    console.error("Error fetching user profile:", err);
    update(state => ({ ...state, error: err.message }));
    return null;
  }
}

export const auth = {
  subscribe,
  setToken: async (token: string) => {
    saveToken(token); // Use the new saveToken function
    const user = await fetchUserProfile(token);
    const tokenInfo = getTokenInfo();
    if (user) {
      update((state) => ({ 
        ...state, 
        token, 
        user, 
        isAuthenticated: true, 
        error: null,
        tokenExpiresAt: tokenInfo?.expiresAt || null,
        isTokenExpiringSoon: tokenInfo?.isExpiringSoon || false
      }));
    } else {
      // Handle case where token is set but user profile fetch fails
      update((state) => ({ 
        ...state, 
        token, 
        isAuthenticated: true, 
        user: null, 
        error: 'Failed to fetch user profile after setting token.',
        tokenExpiresAt: tokenInfo?.expiresAt || null,
        isTokenExpiringSoon: tokenInfo?.isExpiringSoon || false
      }));
    }
  },
  setUser: (user: User) => {
    update((state) => ({ ...state, user, isAuthenticated: !!user, error: null }));
  },
  logout: () => {
    // Clear saved roles for the current user before logging out
    const currentState = get({ subscribe });
    if (currentState.user?.id) {
      clearSavedUserRoles(currentState.user.id);
    }
    clearToken(); // Use the new clearToken function
    set({ ...initialAuthState, isInitialized: true }); // Keep initialized state
  },
  initialize: async () => {
    if (typeof window !== 'undefined') {
      const token = getToken(); // Use the new getToken function
      if (token) {
        const user = await fetchUserProfile(token);
        const tokenInfo = getTokenInfo();
        if (user) {
          update((state) => ({ 
            ...state, 
            token, 
            user, 
            isAuthenticated: true, 
            error: null,
            tokenExpiresAt: tokenInfo?.expiresAt || null,
            isTokenExpiringSoon: tokenInfo?.isExpiringSoon || false,
            isInitialized: true
          }));
        } else {
          // Token might be invalid or expired
          clearToken(); // Use the new clearToken function
          set({ ...initialAuthState, isInitialized: true }); // Reset to initial state but mark as initialized
        }
      } else {
        // No token found, mark as initialized
        update(state => ({ ...state, isInitialized: true }));
      }
    }
  },
  login: async (emailInput: string, passwordInput: string) => {
    update(state => ({ ...state, error: null })); // Clear previous errors
    try {
      const response = await fetch(`${API_BASE_URL}/auth/api/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: emailInput, // API expects 'username' field but we pass email
          password: passwordInput,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(errorData.detail || 'Login failed');
      }
      const tokenData = await response.json() as any;
      await auth.setToken(tokenData.access_token);
      // Mark as initialized after successful login
      update(state => ({ ...state, isInitialized: true }));
      return true;
    } catch (err: any) {
      console.error("Login error:", err);
      update(state => ({ 
        ...state, 
        error: err.message, 
        isAuthenticated: false, 
        user: null, 
        token: null,
        tokenExpiresAt: null,
        isTokenExpiringSoon: false,
        isInitialized: true
      }));
      return false;
    }
  },
  register: async (userData: any) => { // Consider creating a specific type for registration payload
    update(state => ({ ...state, error: null }));
    try {
      const response = await fetch(`${API_BASE_URL}/auth/api/v1/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const errorData = await response.json() as any;
        // API might return an array of validation errors
        const message = errorData.detail && Array.isArray(errorData.detail) ?
                        errorData.detail.map((d: any) => `${d.loc.join('.')} - ${d.msg}`).join(', ') :
                        (errorData.detail || 'Registration failed');
        throw new Error(message);
      }
      const newUser = await response.json() as any;
      // Assuming registration returns a user object similar to UserOut, but might not include a token directly.
      // Or it might return a token, in which case we can log the user in.
      // For now, let's assume it returns the user and we might need to login separately or the API auto-logs in.
      // Based on UserOut, it seems a token IS returned.
      if (newUser.token) {
        await auth.setToken(newUser.token);
         // The setToken function will fetch the full user profile
      } else {
        // If no token, just update with basic user info, but this scenario needs clarification from API spec
         update(state => ({ ...state, user: newUser as User, isAuthenticated: false, error: "Registration successful, but no token returned."}));
      }
      return true;
    } catch (err: any) {
      console.error("Registration error:", err);
      update(state => ({ ...state, error: err.message }));
      return false;
    }
  },
  clearError: () => {
    update(state => ({ ...state, error: null }));
  },
  updateUserRoles: (userId: string, newRoles: string[]) => {
    // Update roles both in store and localStorage
    saveUserRoles(userId, newRoles);
    update(state => {
      if (state.user && state.user.id === userId) {
        return { ...state, user: { ...state.user, roles: newRoles } };
      }
      return state;
    });
  },
  refreshUserProfile: async () => {
    // Force refresh the user profile from the backend
    const currentState = get({ subscribe });
    if (currentState.token) {
      const user = await fetchUserProfile(currentState.token);
      const tokenInfo = getTokenInfo();
      if (user) {
        update(state => ({ 
          ...state, 
          user, 
          error: null,
          tokenExpiresAt: tokenInfo?.expiresAt || null,
          isTokenExpiringSoon: tokenInfo?.isExpiringSoon || false
        }));
      }
    }
  },
  // New method to check if token is still valid
  checkTokenValidity: () => {
    const token = getToken();
    const tokenInfo = getTokenInfo();
    if (!token) {
      // No token, logout
      auth.logout();
      return false;
    }
    if (tokenInfo) {
      update(state => ({
        ...state,
        tokenExpiresAt: tokenInfo.expiresAt,
        isTokenExpiringSoon: tokenInfo.isExpiringSoon
      }));
    }
    return true;
  },
  // Get current token info
  getTokenInfo: () => getTokenInfo()
};

// Initialize on load (client-side only)
if (typeof window !== 'undefined') {
  auth.initialize();
  
  // Set up periodic token validity checking (every 30 minutes)
  setInterval(() => {
    auth.checkTokenValidity();
  }, 30 * 60 * 1000); // 30 minutes
  
  // Also check when the page becomes visible again (user switches back to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      auth.checkTokenValidity();
    }
  });
}
