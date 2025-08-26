import { writable } from 'svelte/store';

interface ArtifactState {
  show: boolean;
  filename: string;
  code: string;
  isStreaming: boolean;
}

function createArtifactStore() {
  const { subscribe, set, update } = writable<ArtifactState>({
    show: false,
    filename: '',
    code: '',
    isStreaming: false
  });

  return {
    subscribe,
    open: (filename: string, code: string = '', streaming: boolean = false) => 
      set({ show: true, filename, code, isStreaming: streaming }),
    appendCode: (codeChunk: string) => {
      update(state => {
        if (!state.show) return state;
        return { ...state, code: state.code + codeChunk };
      });
    },
    updateCode: (newCode: string) => {
      update(state => {
        if (!state.show) return state;
        return { ...state, code: newCode };
      });
    },
    finishStreaming: () => {
      update(state => ({ ...state, isStreaming: false }));
    },
    close: () => set({ show: false, filename: '', code: '', isStreaming: false })
  };
}

export const artifactStore = createArtifactStore();
export const artifactWidth = writable(0);
