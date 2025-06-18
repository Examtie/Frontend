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
}

const API_BASE_URL = 'https://examtieapi.breadtm.xyz';

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
    const savedRoles = getSavedUserRoles(userData.id || '');
    
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
    localStorage.setItem('authToken', token);
    const user = await fetchUserProfile(token);
    if (user) {
      update((state) => ({ ...state, token, user, isAuthenticated: true, error: null }));
    } else {
      // Handle case where token is set but user profile fetch fails
      update((state) => ({ ...state, token, isAuthenticated: true, user: null, error: 'Failed to fetch user profile after setting token.' }));
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
    localStorage.removeItem('authToken');
    set(initialAuthState);
  },
  initialize: async () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        const user = await fetchUserProfile(token);
        if (user) {
          update((state) => ({ ...state, token, user, isAuthenticated: true, error: null }));
        } else {
          // Token might be invalid or expired
          localStorage.removeItem('authToken');
          set(initialAuthState); // Reset to initial state
        }
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
      return true;
    } catch (err: any) {
      console.error("Login error:", err);
      update(state => ({ ...state, error: err.message, isAuthenticated: false, user: null, token: null }));
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
      if (user) {
        update(state => ({ ...state, user, error: null }));
      }
    }
  }
};

// Initialize on load (client-side only)
if (typeof window !== 'undefined') {
  auth.initialize();
}
