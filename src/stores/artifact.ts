import { writable } from 'svelte/store';

interface ArtifactState {
  show: boolean;
  filename: string;
  code: string;
}

function createArtifactStore() {
  const { subscribe, set, update } = writable<ArtifactState>({
    show: false,
    filename: '',
    code: ''
  });

  return {
    subscribe,
    open: (filename: string, code: string = '') => set({ show: true, filename, code }),
    appendCode: (codeChunk: string) => {
      update(state => {
        if (!state.show) return state; // Don't append if not showing
        return { ...state, code: state.code + codeChunk };
      });
    },
    close: () => set({ show: false, filename: '', code: '' })
  };
}

export const artifactStore = createArtifactStore();
