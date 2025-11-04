import { writable } from 'svelte/store';

export interface HistoryItem {
  session_number: number;
  prompt: string;
  timestamp: string;
}

function createHistoryStore() {
  const { subscribe, set, update } = writable<HistoryItem[]>([]);

  return {
    subscribe,
    update, // Now exposing the update method
    setHistory: (history: HistoryItem[]) => {
      set(history);
    },
    addHistoryItem: (item: HistoryItem) => {
      update(history => [item, ...history]);
    },
    refreshHistory: () => {
      // Force reactivity update
      update(history => [...history]);
    }
  };
}

export const historyStore = createHistoryStore();