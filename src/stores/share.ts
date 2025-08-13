import { writable } from 'svelte/store';

interface ShareState {
  isShareModalOpen: boolean;
  shareUrl: string | null;
  shareId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ShareState = {
  isShareModalOpen: false,
  shareUrl: null,
  shareId: null,
  isLoading: false,
  error: null,
};

function createShareStore() {
  const { subscribe, set, update } = writable<ShareState>(initialState);

  return {
    subscribe,
    openModal: () => update(state => ({ ...state, isShareModalOpen: true, error: null, shareUrl: null })),
    closeModal: () => set(initialState),
    setLoading: (loading: boolean) => update(state => ({ ...state, isLoading: loading })),
    setError: (error: string) => update(state => ({ ...state, error, isLoading: false })),
    setSharedLink: (shareId: string, shareUrl: string) => update(state => ({
      ...state,
      shareId,
      shareUrl,
      isLoading: false,
      error: null,
    })),
  };
}

export const shareStore = createShareStore();
