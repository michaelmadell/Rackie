import { useApp } from './AppContext';
import type { ThemePref } from './theme';

const next: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
const label: Record<ThemePref, string> = { system: 'Match system', light: 'Light', dark: 'Dark' };

const icons: Record<ThemePref, React.ReactNode> = {
  // A monitor: follow the system setting
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
};

/** Cycles the theme: match system → light → dark. */
export function ThemeToggle() {
  const { theme, themePref, setThemePref } = useApp();
  const now = themePref === 'system' ? `Match system (${theme})` : label[themePref];
  return (
    <button
      className="icon theme-toggle"
      onClick={() => setThemePref(next[themePref])}
      title={`Theme: ${now}. Click for ${label[next[themePref]].toLowerCase()}.`}
      aria-label={`Theme: ${now}`}
    >
      {icons[themePref]}
    </button>
  );
}