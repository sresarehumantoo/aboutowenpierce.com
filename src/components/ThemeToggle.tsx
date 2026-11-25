'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'theme'

function applyTheme(newTheme: Theme) {
  const root = document.documentElement

  if (newTheme === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', newTheme)
  }
}

// Minimal external store over localStorage. Reading the persisted theme
// through useSyncExternalStore lets us get it during render instead of via a
// setState-in-effect, while getServerSnapshot() returning null keeps the
// server and first client render in agreement (the old `mounted` guard).
const listeners = new Set<() => void>()

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

// '' means "mounted, nothing persisted yet" — distinct from null (server).
function getSnapshot(): string | null {
  return localStorage.getItem(THEME_KEY) ?? ''
}

function getServerSnapshot(): string | null {
  return null
}

function setStoredTheme(newTheme: Theme) {
  localStorage.setItem(THEME_KEY, newTheme)
  for (const listener of listeners) listener()
}

export function ThemeToggle() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [animating, setAnimating] = useState(false)

  const mounted = stored !== null
  const theme = (stored || 'system') as Theme

  // Sync the DOM to the persisted theme. Only applies when something was
  // actually stored, matching the previous mount effect — an unset theme
  // leaves whatever the pre-hydration inline script decided.
  useEffect(() => {
    if (stored) applyTheme(stored as Theme)
  }, [stored])

  const toggleTheme = () => {
    setAnimating(true)
    const nextTheme: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setStoredTheme(nextTheme)
    applyTheme(nextTheme)
    setTimeout(() => setAnimating(false), 400)
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button className="theme-toggle" aria-label="Toggle theme">
        <span className="theme-icon" />
      </button>
    )
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Current theme: ${theme}. Click to toggle.`}
      title={`Theme: ${theme}`}
    >
      <span className={`theme-icon-wrapper ${animating ? 'theme-icon-spin' : ''}`}>
        {theme === 'light' && (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        )}
        {theme === 'dark' && (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
        {theme === 'system' && (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        )}
      </span>
    </button>
  )
}
