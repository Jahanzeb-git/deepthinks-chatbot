import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

function createThemeStore() {
  // 1. Determine the initial theme
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') {
      return 'light'; // Default for SSR
    }
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      return storedTheme;
    }
    // Fallback to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const initialTheme = getInitialTheme();
  
  const { subscribe, set } = writable<Theme>(initialTheme);

  // 2. Apply the initial theme to the document
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', initialTheme);
  }

  return {
    subscribe,
    set: (theme: Theme) => {
      if (typeof document !== 'undefined') {
        // 3. Update the DOM and localStorage whenever the theme is set
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
      }
      set(theme);
    },
    toggle: () => {
      update(theme => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        // The set method above will handle DOM and localStorage
        set(newTheme); 
        return newTheme;
      });
    }
  };
}

export const themeStore = createThemeStore();