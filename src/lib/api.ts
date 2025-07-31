import { authStore } from '../stores/auth';
import { get } from 'svelte/store';
import type { UserSettings } from '../stores/settings'; // Import the shared type

const BASE_URL = 'https://jahanzebahmed25.pythonanywhere.com';

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const auth = get(authStore);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new APIError(response.status, errorData.message || errorData.error || 'Request failed');
  }

  // For PATCH, success response might not have a body, so handle that
  if (response.status === 200 && options.method === 'PATCH') {
    return response.json().catch(() => ({})); // Return empty object if body is empty
  }
  
  return response.json();
}

export const api = {
  // Authentication
  async signup(username: string, email: string, password: string) {
    const response = await makeRequest('/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    return response; // Returns { message: "Signup successful. Please log in to continue." }
  },

  async login(email: string, password: string) {
    const response = await makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    return response; // Returns { access_token, user: { email, username, profile_picture } }
  },

  async googleLogin(token: string) {
    const response = await makeRequest('/google-login', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    return response; // Returns { access_token, token_type, user: { email, username, profile_picture } }
  },

  // Session Management
  async createSession() {
    const response = await makeRequest('/session_inc');
    return response;
  },

  // Chat
  async sendMessage(sessionId: string, query: string, reason: boolean = false) {
    const auth = get(authStore);
    const body: any = { query, reason };
    
    if (auth.isAuthenticated) {
      body.session_id = sessionId;
    } else {
      body.session_id = sessionId;
    }

    // sendMessage uses fetch directly, let's keep it that way for streaming
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {})
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new APIError(response.status, errorData.message || errorData.error || 'Request failed');
    }

    return response;
  },

  // History
  async getHistory() {
    return makeRequest('/history');
  },

  async getSessionHistory(sessionNumber: number) {
    return makeRequest(`/history/${sessionNumber}`);
  },

  // Settings
  async getSettings(): Promise<UserSettings> {
    return makeRequest('/settings');
  },

  async updateSettings(settings: Partial<UserSettings & { theme: string }>) {
    return makeRequest('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  },

  // User Account
  async deleteUser() {
    return makeRequest('/delete_user', {
      method: 'DELETE'
    });
  }
};