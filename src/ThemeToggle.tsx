import { useEffect, useLayoutEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const key = 'split-theme';
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* Use system preference when storage is unavailable. */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);
  useEffect(() => {
    try {
      localStorage.setItem(key, mode);
    } catch {
      /* Theme still works for this visit. */
    }
  }, [mode]);
  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
      onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
    >
      {mode === 'dark' ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}
