import { writable } from 'svelte/store';

export interface SessionStore {
  sessions: number[];
  currentSession: number | null;
}

const initialState: SessionStore = {
  sessions: [],
  currentSession: null
};

function createSessionStore() {
  const { subscribe, set, update } = writable<SessionStore>(initialState);

  return {
    subscribe,
    addSession: (sessionNumber: number) => {
      update(state => {
        const newSessions = [sessionNumber, ...state.sessions];
        localStorage.setItem('deepthinks_sessions', JSON.stringify(newSessions));
        return {
          sessions: newSessions,
          currentSession: sessionNumber
        };
      });
    },
    setCurrentSession: (sessionNumber: number) => {
      update(state => {
        // Move session to front if it exists, otherwise add it
        const filteredSessions = state.sessions.filter(s => s !== sessionNumber);
        const newSessions = [sessionNumber, ...filteredSessions];
        localStorage.setItem('deepthinks_sessions', JSON.stringify(newSessions));
        return {
          sessions: newSessions,
          currentSession: sessionNumber
        };
      });
    },
    getCurrentSession: () => {
      let currentSession: number | null = null;
      update(state => {
        currentSession = state.sessions[0] || null;
        return { ...state, currentSession };
      });
      return currentSession;
    },
    initializeFromStorage: () => {
      const sessionsStr = localStorage.getItem('deepthinks_sessions');
      if (sessionsStr) {
        try {
          const sessions = JSON.parse(sessionsStr);
          update(state => ({
            sessions,
            currentSession: sessions[0] || null
          }));
        } catch (e) {
          console.error('Failed to parse sessions from localStorage');
        }
      }
    }
  };
}

export const sessionStore = createSessionStore();