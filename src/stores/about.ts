import { writable } from 'svelte/store';

function createAboutModalStore() {
  const { subscribe, set, update } = writable({ isOpen: false });

  return {
    subscribe,
    openModal: () => set({ isOpen: true }),
    closeModal: () => set({ isOpen: false }),
    toggleModal: () => update(state => ({ ...state, isOpen: !state.isOpen }))
  };
}

export const aboutModalStore = createAboutModalStore();