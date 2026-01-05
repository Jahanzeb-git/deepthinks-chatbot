import { writable, get } from 'svelte/store';
import { authStore } from './auth';

export interface TimeseriesEntry {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface AnalyticsSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_interactions: number;
}

export interface AnalyticsData {
  timeseries: TimeseriesEntry[];
  summary: AnalyticsSummary;
}

export interface AnalyticsState {
  isAnalyticsModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
  data: AnalyticsData | null;
  period: '7d' | '30d' | '90d' | 'all';
  groupBy: 'day' | 'week' | 'month';
}

const BASE_URL = 'https://chatbot-backend-wandering-shadow-534.fly.dev';

function createAnalyticsStore() {
  const { subscribe, set, update } = writable<AnalyticsState>({
    isAnalyticsModalOpen: false,
    isLoading: false,
    error: null,
    data: null,
    period: '30d',
    groupBy: 'day',
  });

  async function fetchAnalytics(period: '7d' | '30d' | '90d' | 'all', groupBy: 'day' | 'week' | 'month') {
    const token = localStorage.getItem('deepthinks_token');
    const userStr = localStorage.getItem('deepthinks_user');

    if (!token || !userStr) {
      update(state => ({ ...state, error: 'Not authenticated', isLoading: false }));
      return;
    }

    let email: string;
    try {
      const user = JSON.parse(userStr);
      email = user.email;
    } catch {
      update(state => ({ ...state, error: 'Invalid user data', isLoading: false }));
      return;
    }

    update(state => ({ ...state, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams({
        email,
        period,
        group_by: groupBy,
      });

      const response = await fetch(`${BASE_URL}/api/analytics?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      if (result.ok && result.data) {
        update(state => ({
          ...state,
          data: result.data,
          isLoading: false,
          error: null,
        }));
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      update(state => ({
        ...state,
        error: error.message || 'Failed to fetch analytics',
        isLoading: false,
      }));
    }
  }

  return {
    subscribe,
    openAnalyticsModal: () => {
      update(state => ({ ...state, isAnalyticsModalOpen: true }));
      // Fetch with current period and groupBy
      const currentState = get(analyticsStore);
      fetchAnalytics(currentState.period, currentState.groupBy);
    },
    closeAnalyticsModal: () => update(state => ({ ...state, isAnalyticsModalOpen: false })),

    setPeriod: (period: '7d' | '30d' | '90d' | 'all') => {
      update(state => ({ ...state, period }));
      const currentState = get(analyticsStore);
      fetchAnalytics(period, currentState.groupBy);
    },

    setGroupBy: (groupBy: 'day' | 'week' | 'month') => {
      update(state => ({ ...state, groupBy }));
      const currentState = get(analyticsStore);
      fetchAnalytics(currentState.period, groupBy);
    },

    refresh: () => {
      const currentState = get(analyticsStore);
      fetchAnalytics(currentState.period, currentState.groupBy);
    },

    // Backward-compatible methods for existing code
    syncAnalytics: () => {
      const currentState = get(analyticsStore);
      fetchAnalytics(currentState.period, currentState.groupBy);
    },

    resetAnalytics: () => {
      // Reset local state
      update(state => ({ ...state, data: null, error: null }));
    },

    // No-op: backend now tracks token usage automatically
    addTokenUsage: async (_model: string, _inputTokens: number, _outputTokens: number) => {
      // Token usage is now tracked by the backend automatically
      // This method is kept for backward compatibility
    },

    set,
  };
}

export const analyticsStore = createAnalyticsStore();
