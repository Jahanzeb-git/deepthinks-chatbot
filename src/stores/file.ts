import { writable } from 'svelte/store';

export interface FileState {
  file: File | null;
  filename: string | null;
  size: number | null;
  type: string | null;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error: string | null;
}

const initialState: FileState = {
  file: null,
  filename: null,
  size: null,
  type: null,
  status: 'idle',
  error: null,
};

function createFileStore() {
  const { subscribe, set, update } = writable<FileState>(initialState);

  return {
    subscribe,
    setFile: (file: File) => {
      update(state => ({
        ...state,
        file,
        filename: file.name,
        size: file.size,
        type: file.type,
        status: 'idle',
        error: null,
      }));
    },
    setStatus: (status: 'uploading' | 'success' | 'error', error?: string) => {
      update(state => ({
        ...state,
        status,
        error: error || null,
      }));
    },
    setSuccess: (filename: string, size: number, type: string) => {
      update(state => ({
        ...state,
        status: 'success',
        filename,
        size,
        type,
        error: null,
      }));
    },
    clearFile: () => {
      set(initialState);
    },
  };
}

export const fileStore = createFileStore();
