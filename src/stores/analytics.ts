import { writable, get } from 'svelte/store';
import { api } from '../lib/api';

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
    const storedUsage = localStorage.getItem('tokenUsage');
    if (!storedUsage) {
      try {
        const response = await api.getTokenUsage();
        if (response.ok && response.items) {
          const usageData = response.items.map((item: any) => ({
            timestamp: item.timestamp,
            model: item.model,
            inputTokens: item.inputTokens,
            outputTokens: item.outputTokens,
          }));
          saveUsageToStorage(usageData);
          update(state => ({ ...state, tokenUsage: usageData }));
        }
      } catch (error) {
        console.error('Failed to sync analytics from backend:', error);
      }
    }
  }

  return {
    subscribe,
    openAnalyticsModal: () => {
      const storedUsage = localStorage.getItem('tokenUsage');
      if (storedUsage) {
        update(state => ({ ...state, tokenUsage: JSON.parse(storedUsage) }));
      }
      update(state => ({ ...state, isAnalyticsModalOpen: true }));
    },
    closeAnalyticsModal: () => update(state => ({ ...state, isAnalyticsModalOpen: false })),
    addTokenUsage: async (model: string, inputTokens: number, outputTokens: number) => {
      const newUsage: TokenUsage = {
        timestamp: Date.now(),
        model,
        inputTokens,
        outputTokens,
      };
      const currentState = get(analyticsStore);
      const updatedUsage = [...currentState.tokenUsage, newUsage];
      saveUsageToStorage(updatedUsage);
      update(state => ({ ...state, tokenUsage: updatedUsage }));

      try {
        await api.postTokenUsage(newUsage);
      } catch (error) {
        console.error('Failed to post token usage to backend:', error);
        // Here you might want to implement a retry mechanism
        // or store failed requests to send later.
      }
    },
    syncAnalytics,
    set,
  };
}

export const analyticsStore = createAnalyticsStore();
