import { browser } from '$app/environment';

const KEY = 'movie-quotes:theme';
export type Theme = 'light' | 'dark' | 'system';

export function loadTheme(): Theme {
  if (!browser) return 'system';
  return (localStorage.getItem(KEY) as Theme | null) ?? 'system';
}

/** Apply the theme by setting (or clearing) the data-theme attribute on <html>. */
export function applyTheme(theme: Theme): void {
  if (!browser) return;
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Ignore storage failures; the theme still applies for this session.
  }
}

export function nextTheme(current: Theme): Theme {
  const order: Theme[] = ['system', 'light', 'dark'];
  return order[(order.indexOf(current) + 1) % order.length]!;
}
