import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

// Also read by the inline script in index.html to set the theme before first paint.
export const THEME_STORAGE_KEY = 'paperless:theme'

const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#f2eee4', dark: '#1d1c1b' }
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Storage can be unavailable (private mode, blocked site data); fall back to the OS setting.
  }
  return 'system'
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference
  return darkQuery().matches ? 'dark' : 'light'
}

function apply(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(preference))

  useEffect(() => {
    const update = () => {
      const next = resolve(preference)
      setResolved(next)
      apply(next)
    }
    update()
    if (preference !== 'system') return
    const query = darkQuery()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Non-critical: the theme still applies for this session.
    }
  }, [])

  const toggle = useCallback(() => {
    setPreference(resolve(preference) === 'dark' ? 'light' : 'dark')
  }, [preference, setPreference])

  return { preference, resolved, setPreference, toggle }
}
