import { type ReactElement, useState } from 'react';
import { saveTheme } from '../lib/storage.js';

function currentTheme(): 'light' | 'dark' {
  const chosen = document.documentElement.dataset['theme'];
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Switches between the light and dark themes and remembers the choice. */
export function ThemeToggle(): ReactElement {
  const [theme, setTheme] = useState(currentTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  const toggle = () => {
    document.documentElement.dataset['theme'] = next;
    saveTheme(next);
    setTheme(next);
  };
  return (
    <button
      type="button"
      className="button button-quiet"
      onClick={toggle}
      aria-pressed={theme === 'dark'}
    >
      Dark mode
    </button>
  );
}
