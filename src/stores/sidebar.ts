import { writable } from 'svelte/store';

export const isSidebarExpanded = writable<boolean>(false);