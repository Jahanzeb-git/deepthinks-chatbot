import { writable } from 'svelte/store';
import { api } from '../lib/api';

export interface User {
  email: string;
  username: string;
  profile_picture?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isSignedUp: boolean;
  user: User | null;
  token: string | null;
  activeApiKeyIdentifier: string;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isSignedUp: false,
  user: null,
  token: null,
  activeApiKeyIdentifier: '_default',
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    signup: () => {
      // Only mark as signed up, no token or user data
      localStorage.setItem('deepthinks_signed_up', 'true');
      update(state => ({
        ...state,
        isSignedUp: true,
        isAuthenticated: false,
        user: null,
        token: null
      }));
    },
    login: (token: string, user: User) => {
      localStorage.setItem('deepthinks_token', token);
      localStorage.setItem('deepthinks_user', JSON.stringify(user));
      localStorage.setItem('deepthinks_signed_up', 'true');
      update(state => ({
        ...state,
        isAuthenticated: true,
        isSignedUp: true,
        user,
        token,
        activeApiKeyIdentifier: '_default' // Reset to default on login
      }));
    },
    logout: () => {
      // Remove all auth data from localStorage
      localStorage.removeItem('deepthinks_token');
      localStorage.removeItem('deepthinks_user');
      localStorage.removeItem('tokenUsage');
      // Keep signed up status so user sees login button instead of signup
      update(state => ({
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        activeApiKeyIdentifier: '_default' // Reset to default
        // isSignedUp remains true
      }));
    },
    updateUser: (newDetails: Partial<User>) => {
      update(state => {
        if (!state.user) return state;
        const updatedUser = { ...state.user, ...newDetails };
        localStorage.setItem('deepthinks_user', JSON.stringify(updatedUser));
        return { ...state, user: updatedUser };
      });
    },
    deleteAccount: async () => {
      await api.deleteUser();
      // On successful deletion, clear all local data and reset the app state.
      update(state => {
        localStorage.removeItem('deepthinks_token');
        localStorage.removeItem('deepthinks_user');
        localStorage.removeItem('deepthinks_signed_up');
        // Also clear settings and theme from local storage
        localStorage.removeItem('deepthinks_settings');
        localStorage.removeItem('theme');
        return initialState;
      });
    },
    clearAllData: () => {
      // Complete reset - used for testing or complete logout
      localStorage.removeItem('deepthinks_token');
      localStorage.removeItem('deepthinks_user');
      localStorage.removeItem('deepthinks_signed_up');
      set(initialState);
    },
    setActiveApiKeyIdentifier: (identifier: string) => {
      update(state => ({
        ...state,
        activeApiKeyIdentifier: identifier,
      }));
    },
    initializeFromStorage: async () => {
      const token = localStorage.getItem('deepthinks_token');
      const userStr = localStorage.getItem('deepthinks_user');
      const signedUp = localStorage.getItem('deepthinks_signed_up') === 'true';
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          update(state => ({
            ...state,
            isAuthenticated: true,
            isSignedUp: true,
            user,
            token
          }));

          // After authenticating, fetch the user's key status
          const keyResponse = await api.getUserKey();
          if (keyResponse && keyResponse.api_key_masked) {
            update(state => ({ ...state, activeApiKeyIdentifier: keyResponse.api_key_masked }));
          } else {
            update(state => ({ ...state, activeApiKeyIdentifier: '_default' }));
          }

        } catch (e) {
          console.error('Failed to initialize auth from storage:', e);
          // Clear corrupted data
          localStorage.removeItem('deepthinks_token');
          localStorage.removeItem('deepthinks_user');
          update(state => ({
            ...state,
            isAuthenticated: false,
            user: null,
            token: null,
            isSignedUp: signedUp
          }));
        }
      } else {
        update(state => ({
          ...state,
          isAuthenticated: false,
          user: null,
          token: null,
          isSignedUp: signedUp
        }));
      }
    }
  };
}

export const authStore = createAuthStore();