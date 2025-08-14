import { writable, get } from 'svelte/store';
import { api } from '../lib/api';
import { authStore } from './auth';

export interface TokenUsage {
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

function createAnalyticsStore() {
  const { subscribe, set, update } = writable({
    isAnalyticsModalOpen: false,
    tokenUsage: [] as TokenUsage[],
  });

  function saveUsageToStorage(usage: TokenUsage[]) {
    localStorage.setItem('tokenUsage', JSON.stringify(usage));
  }

  async function syncAnalytics() {
    const auth = get(authStore);
    // First, reset everything to ensure a clean slate.
    localStorage.removeItem('tokenUsage');
    update(state => ({ ...state, tokenUsage: [] }));

    try {
      // Fetch the full history for the active key, not just recent.
      const response = await api.getTokenUsage(auth.activeApiKeyIdentifier);
      if (response.ok && response.items) {
        const newUsage = response.items.map((item: any) => ({
          timestamp: item.timestamp,
          model: item.model,
          inputTokens: item.inputTokens,
          outputTokens: item.outputTokens,
        }));

        newUsage.sort((a, b) => a.timestamp - b.timestamp);

        saveUsageToStorage(newUsage);
        update(state => ({ ...state, tokenUsage: newUsage }));
      }
    } catch (error) {
      console.error('Failed to sync analytics from backend:', error);
    }
  }

  return {
    subscribe,
    openAnalyticsModal: () => {
      update(state => ({ ...state, isAnalyticsModalOpen: true }));
      syncAnalytics(); // Always sync from a clean state when opening.
    },
    closeAnalyticsModal: () => update(state => ({ ...state, isAnalyticsModalOpen: false })),
    addTokenUsage: async (model: string, inputTokens: number, outputTokens: number) => {
      const auth = get(authStore);
      const newUsage: TokenUsage = {
        timestamp: Date.now(),
        model,
        inputTokens,
        outputTokens,
      };
      
      // Add to local state immediately for responsiveness
      const currentState = get(analyticsStore);
      const updatedUsage = [...currentState.tokenUsage, newUsage];
      saveUsageToStorage(updatedUsage);
      update(state => ({ ...state, tokenUsage: updatedUsage }));

      try {
        await api.postTokenUsage(newUsage, auth.activeApiKeyIdentifier);
      } catch (error) {
        console.error('Failed to post token usage to backend:', error);
      }
    },

    resetAnalytics: () => {
      localStorage.removeItem('tokenUsage');
      update(state => ({ ...state, tokenUsage: [] }));
    },
    syncAnalytics,
    set,
  };
}

export const analyticsStore = createAnalyticsStore();
