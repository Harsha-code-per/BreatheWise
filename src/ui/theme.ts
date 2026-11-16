/**
 * The light/dark theme: the visitor's explicit choice if any, otherwise the system setting.
 * Components subscribe with `useTheme`, so the landing sky and the app switch together.
 */
import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const CHANGE = 'bw:theme';
const THEME_KEY = 'bw-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The theme in effect right now. */
function currentTheme(): Theme {
  const chosen = document.documentElement.dataset['theme'];
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Applies and remembers a theme, and tells every subscriber. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The choice still applies to this visit.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void): () => void {
  const system = window.matchMedia(DARK_QUERY);
  window.addEventListener(CHANGE, onChange);
  system.addEventListener('change', onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    system.removeEventListener('change', onChange);
  };
}

/** The current theme, re-rendering when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme);
}
