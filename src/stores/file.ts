import { writable } from 'svelte/store';

export interface FileItem {
  file: File;
  originalName: string;
  storedName?: string; // After upload
  size: number;
  type: string;
  isImage: boolean;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface FileState {
  files: FileItem[];
  status: 'idle' | 'uploading' | 'success' | 'error';
  error: string | null;
}

const initialState: FileState = {
  files: [],
  status: 'idle',
  error: null,
};

function createFileStore() {
  const { subscribe, set, update } = writable<FileState>(initialState);

  return {
    subscribe,
    
    addFiles: (newFiles: File[]) => {
      update(state => {
        const currentCount = state.files.length;
        const availableSlots = 5 - currentCount;
        
        if (newFiles.length > availableSlots) {
          return {
            ...state,
            error: `Maximum 5 files allowed. You can add ${availableSlots} more file(s).`
          };
        }

        const fileItems: FileItem[] = newFiles.map(file => ({
          file,
          originalName: file.name,
          size: file.size,
          type: file.type,
          isImage: file.type.startsWith('image/'),
          uploadStatus: 'pending'
        }));

        return {
          ...state,
          files: [...state.files, ...fileItems],
          error: null
        };
      });
    },

    removeFile: (index: number) => {
      update(state => ({
        ...state,
        files: state.files.filter((_, i) => i !== index),
        error: null
      }));
    },

    setUploadStatus: (status: 'uploading' | 'success' | 'error', error?: string) => {
      update(state => ({
        ...state,
        status,
        error: error || null
      }));
    },

    updateFileAfterUpload: (index: number, storedName: string) => {
      update(state => {
        const newFiles = [...state.files];
        if (newFiles[index]) {
          newFiles[index] = {
            ...newFiles[index],
            storedName,
            uploadStatus: 'success'
          };
        }
        return { ...state, files: newFiles };
      });
    },

    setFileError: (index: number, error: string) => {
      update(state => {
        const newFiles = [...state.files];
        if (newFiles[index]) {
          newFiles[index] = {
            ...newFiles[index],
            uploadStatus: 'error',
            error
          };
        }
        return { ...state, files: newFiles };
      });
    },

    clearFiles: () => {
      set(initialState);
    },

    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
}

export const fileStore = createFileStore();