import { writable } from 'svelte/store';

interface ArtifactState {
  show: boolean;
  filename: string;
  code: string;
  isStreaming: boolean;
  version?: number;
  activeFileKey?: string;
}

function createArtifactStore() {
  const { subscribe, set, update } = writable<ArtifactState>({
    show: false,
    filename: '',
    code: '',
    isStreaming: false,
    version: undefined,
    activeFileKey: undefined
  });

  return {
    subscribe,

    open: (filename: string, code: string = '', streaming: boolean = false, version?: number) => {
      const activeFileKey = version !== undefined ? `${filename}_v${version}` : filename;
      set({
        show: true,
        filename,
        code,
        isStreaming: streaming,
        version,
        activeFileKey
      });
    },

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

    close: () =>
      set({
        show: false,
        filename: '',
        code: '',
        isStreaming: false,
        version: undefined,
        activeFileKey: undefined
      })
  };
}

export const artifactStore = createArtifactStore();
export const artifactWidth = writable(0);
