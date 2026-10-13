// Light / dark theme. The choice ("system", "light" or "dark") is remembered in this
// browser; "system" follows the operating system and changes when it does.
// index.html applies the saved theme before the app loads, so there's no flash of light.
import { useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const KEY = 'rack-viz-theme';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function loadPref(): ThemePref {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system'; // storage blocked: just follow the system
  }
}

export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(loadPref);
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches);

  // Follow the operating system switching between light and dark.
  useEffect(() => {
    const q = darkQuery();
    const onChange = () => setSystemDark(q.matches);
    q.addEventListener('change', onChange);
    return () => q.removeEventListener('change', onChange);
  }, []);

  const theme: Theme = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    try {
      if (p === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {
      // not remembered, but still applied for now
    }
  };

  return { pref, theme, setPref };
}