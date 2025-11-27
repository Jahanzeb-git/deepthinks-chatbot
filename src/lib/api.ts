import { authStore } from '../stores/auth';
import { get } from 'svelte/store';
import type { UserSettings } from '../stores/settings';

const BASE_URL = 'https://chatbot-backend-wandering-shadow-534.fly.dev';

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

  if (response.status === 200 && options.method === 'PATCH') {
    return response.json().catch(() => ({}));
  }

  if (response.status === 201) {
    return response.json();
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
    return response;
  },

  async login(email: string, password: string) {
    const response = await makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    return response;
  },

  async googleLogin(token: string) {
    const response = await makeRequest('/google-login', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    return response;
  },

  // Session Management
  async createSession() {
    return makeRequest('/session_inc');
  },

  // NEW: Delete individual session
  async deleteSession(sessionNumber: number) {
    return makeRequest(`/session/${sessionNumber}`, {
      method: 'DELETE'
    });
  },

  // NEW: Delete all sessions
  async deleteAllSessions() {
    return makeRequest('/sessions/all', {
      method: 'DELETE'
    });
  },

  // Chat
  async sendMessage(
    sessionId: string,
    query: string,
    reason: 'default' | 'reason' | 'code' = 'default',
    signal: AbortSignal,
    onData: (data: { token: string, trace: boolean }) => void,
    onEnd: () => void,
    onError: (error: Error) => void
  ) {
    const auth = get(authStore);
    const body: any = { query, reason };

    if (auth.isAuthenticated) {
      body.session_id = sessionId;
    } else {
      body.session_id = sessionId;
    }

    try {
      const response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {})
        },
        body: JSON.stringify(body),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new APIError(response.status, errorData.message || errorData.error || 'Request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const jsonStr = line.substring(5).trim();
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr);
                if (data.token) {
                  onData(data);
                }
                if (data.status === 'done') {
                  onEnd();
                }
              } catch (e) {
                console.error('Failed to parse stream data:', e);
              }
            }
          } else if (line.startsWith('event: end-of-stream')) {
            onEnd();
            return;
          }
        }
      }
      onEnd();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(err);
      } else {
        throw err;
      }
    }
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
  },

  // Interrupt
  async interruptGeneration(sessionId: string) {
    return makeRequest('/interrupt', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId })
    });
  },

  // File Upload
  async uploadFile(files: File[], sessionId: string, token: string) {
    const formData = new FormData();
    formData.append('session_id', sessionId);

    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new APIError(response.status, errorData.message || errorData.error || 'Request failed');
    }

    return response.json();
  },

  // Analytics
  async postTokenUsage(usage: any, apiKeyIdentifier: string) {
    const auth = get(authStore);
    if (!auth.user?.email) {
      throw new Error('User email is not available');
    }
    const usageWithIdentifier = { ...usage, api_key_identifier: apiKeyIdentifier };
    return makeRequest('/api/token-usage', {
      method: 'POST',
      headers: {
        'X-User-Email': auth.user.email,
      },
      body: JSON.stringify(usageWithIdentifier),
    });
  },

  async getTokenUsage(apiKeyIdentifier: string, since?: number, limit?: number, offset?: number) {
    const auth = get(authStore);
    if (!auth.user?.email) {
      throw new Error('User email is not available');
    }
    const params = new URLSearchParams({
      email: auth.user.email,
      api_key_identifier: apiKeyIdentifier,
    });
    if (since) params.set('since', since.toString());
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());

    return makeRequest(`/api/token-usage?${params.toString()}`);
  },

  // Sharing
  async shareSession(sessionNumber: number, password?: string) {
    const body: { password?: string } = {};
    if (password) {
      body.password = password;
    }
    return makeRequest(`/session/${sessionNumber}/share`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async getSharedConversation(shareId: string, password?: string) {
    let url = `/conversation-history/share/${shareId}`;
    if (password) {
      url += `?password=${encodeURIComponent(password)}`;
    }
    const response = await fetch(`${BASE_URL}${url}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new APIError(response.status, errorData.message || 'Failed to fetch shared conversation.');
    }
    return response.json();
  },

  // Together AI API Key
  async getUserKey() {
    return makeRequest('/user/key');
  },

  async postUserKey(apiKey: string) {
    return makeRequest('/user/key', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey })
    });
  },

  async deleteUserKey() {
    return makeRequest('/user/key', {
      method: 'DELETE'
    });
  },

  // File Management
  async listFiles() {
    return makeRequest('/files/list');
  },

  async deleteFiles(storedNames?: string[], deleteAll?: boolean) {
    const body: { stored_names?: string[]; delete_all?: boolean } = {};
    if (deleteAll) {
      body.delete_all = true;
    } else if (storedNames && storedNames.length > 0) {
      body.stored_names = storedNames;
    }
    return makeRequest('/files', {
      method: 'DELETE',
      body: JSON.stringify(body)
    });
  },

  // Search Web URLs
  async getSearchWebUrls(sessionNumber: number, active: boolean = true) {
    const params = new URLSearchParams({ active: active.toString() });
    return makeRequest(`/search-web-urls/${sessionNumber}?${params.toString()}`);
  },

  // Machine Status Check (Netlify Function)
  async checkMachineState(): Promise<{ needsBoot: boolean; state: string }> {
    const NETLIFY_FUNCTION_URL = '/.netlify/functions/machine-status';

    try {
      const response = await fetch(NETLIFY_FUNCTION_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to check machine state:', response.status);
        return { needsBoot: false, state: 'unknown' };
      }

      const data = await response.json();
      return {
        needsBoot: data.needsBoot || false,
        state: data.state || 'unknown',
      };
    } catch (error) {
      console.error('Error checking machine state:', error);
      return { needsBoot: false, state: 'unknown' };
    }
  },
};