import { writable } from 'svelte/store';

export interface SessionUuidMap {
  [sessionNumber: number]: string;
}

const STORAGE_KEY = 'deepthinks_session_uuids';

function createSessionUuidStore() {
  const { subscribe, set, update } = writable<SessionUuidMap>({});

  return {
    subscribe,
    initializeFromStorage: () => {
      const uuidsStr = localStorage.getItem(STORAGE_KEY);
      if (uuidsStr) {
        try {
          const uuids = JSON.parse(uuidsStr);
          set(uuids);
        } catch (e) {
          console.error('Failed to parse session UUIDs from localStorage');
        }
      }
    },
    setSessionUuid: (sessionNumber: number, uuid: string) => {
      update(uuids => {
        const newUuids = { ...uuids, [sessionNumber]: uuid };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUuids));
        return newUuids;
      });
    },
    getSessionNumberByUuid: (uuid: string): number | null => {
      const uuidsStr = localStorage.getItem(STORAGE_KEY);
      if (uuidsStr) {
        try {
          const uuids: SessionUuidMap = JSON.parse(uuidsStr);
          for (const sessionNumber in uuids) {
            if (uuids[sessionNumber] === uuid) {
              return parseInt(sessionNumber, 10);
            }
          }
        } catch (e) {
          console.error('Failed to parse session UUIDs from localStorage');
        }
      }
      return null;
    },
    getUuidBySessionNumber: (sessionNumber: number): string | null => {
        const uuidsStr = localStorage.getItem(STORAGE_KEY);
        if (uuidsStr) {
          try {
            const uuids: SessionUuidMap = JSON.parse(uuidsStr);
            return uuids[sessionNumber] || null;
          } catch (e) {
            console.error('Failed to parse session UUIDs from localStorage');
          }
        }
        return null;
    }
  };
}

export const sessionUuidStore = createSessionUuidStore();

sessionUuidStore.initializeFromStorage();
