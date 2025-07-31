import { writable, get } from 'svelte/store';
import { api } from '../lib/api';
import { authStore } from './auth';

// 1. Comprehensive UserSettings interface matching the API
export interface UserSettings {
  username: string;
  email: string;
  temperature: number;
  top_p: number;
  what_we_call_you: string;
  system_prompt: string;
  together_api_key: string | null;
  profile_picture: string | null;
  reasoning: boolean;
}

// 2. State interface for the store
interface SettingsState {
  settings: Partial<UserSettings>;
  isSettingsModalOpen: boolean;
  isCustomizeModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

// 3. Default values, closely matching the API's defaults
const defaultSettings: Partial<UserSettings> = {
  temperature: 0.7,
  top_p: 1.0,
  what_we_call_you: '',
  system_prompt: 'You are a helpful assistant.',
  together_api_key: null,
  reasoning: false,
};

function createSettingsStore() {
  const { subscribe, set, update } = writable<SettingsState>({
    settings: { ...defaultSettings },
    isSettingsModalOpen: false,
    isCustomizeModalOpen: false,
    isLoading: false, // Start with loading false, fetch will set it
    error: null,
  });

  // The applyTheme function is removed. The logic is now centralized in App.svelte.

  // Fetches from API and updates store & localStorage
  async function fetchSettings() {
    update(state => ({ ...state, isLoading: true, error: null }));
    try {
      const fetchedSettings = await api.getSettings();
      const newSettings = { ...defaultSettings, ...fetchedSettings };
      
      update(state => ({
        ...state,
        settings: newSettings,
        isLoading: false,
      }));
      
      localStorage.setItem('deepthinks_settings', JSON.stringify(newSettings));
      // The call to applyTheme is removed.
      
    } catch (e: any) {
      console.error("Failed to fetch settings:", e);
      update(state => ({ ...state, isLoading: false, error: e.message }));
    }
  }

  // The main update function with optimistic UI updates
  async function updateSettings(newSettings: Partial<UserSettings>) {
    let originalSettings: Partial<UserSettings> = {};
    
    // 1. Optimistically update the UI
    update(state => {
      originalSettings = { ...state.settings }; // Save original state for potential rollback
      const updatedSettings = { ...state.settings, ...newSettings };
      
      // The call to applyTheme is removed.
      
      localStorage.setItem('deepthinks_settings', JSON.stringify(updatedSettings));
      
      return {
        ...state,
        settings: updatedSettings,
        isLoading: true, // Indicate background activity
        error: null,
      };
    });

    // 2. Synchronize with the backend
    try {
      // Send only the changed data
      await api.updateSettings(newSettings);
      
      // On success, fetch the canonical state from the backend to ensure consistency.
      await fetchSettings();
    } catch (e: any) {
      console.error("Failed to update settings:", e);
      
      // If the update fails, roll back to the original state
      update(state => {
        // The call to applyTheme is removed.
        localStorage.setItem('deepthinks_settings', JSON.stringify(originalSettings));
        return {
          ...state,
          settings: originalSettings,
          isLoading: false,
          error: e.message,
        };
      });
    }
  }

  function toggleReasoning() {
    update(state => {
      const newSettings = { ...state.settings, reasoning: !state.settings.reasoning };
      localStorage.setItem('deepthinks_settings', JSON.stringify(newSettings));
      return { ...state, settings: newSettings };
    });
  }

  return {
    subscribe,
    // Initializes the store from localStorage and then fetches from server if authenticated
    initialize: () => {
      if (typeof window === 'undefined') return;

      try {
        const storedSettings = localStorage.getItem('deepthinks_settings');
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          update(state => ({
            ...state,
            settings: { ...defaultSettings, ...parsedSettings },
          }));
          // The call to applyTheme is removed.
        }
      } catch (e) {
        console.error("Failed to parse stored settings:", e);
        localStorage.removeItem('deepthinks_settings');
      }

      // If user is already authenticated when the app loads, fetch settings.
      const auth = get(authStore);
      if (auth.isAuthenticated) {
        fetchSettings();
      }

      // Listen for future auth changes
      authStore.subscribe(currentAuth => {
        if (currentAuth.isAuthenticated) {
          fetchSettings();
        } else {
          // User logged out, clear settings and revert to defaults
          localStorage.removeItem('deepthinks_settings');
          update(state => ({
            ...state,
            settings: { ...defaultSettings },
          }));
          // The call to applyTheme is removed.
        }
      });
    },
    // Expose the corrected update function
    updateSettings,
    toggleReasoning,
    // Modal controls remain the same
    openSettingsModal: () => update(state => ({ ...state, isSettingsModalOpen: true })),
    closeSettingsModal: () => update(state => ({ ...state, isSettingsModalOpen: false })),
    openCustomizeModal: () => update(state => ({ ...state, isCustomizeModalOpen: true })),
    closeCustomizeModal: () => update(state => ({ ...state, isCustomizeModalOpen: false })),
  };
}

export const settingsStore = createSettingsStore();

// Initialize the store when the module is imported
settingsStore.initialize();
