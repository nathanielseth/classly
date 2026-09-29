import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'

import {
  THEME_STORAGE_KEY,
  applyTheme,
  isTheme,
  readStoredTheme,
  resolveTheme,
  subscribeToSystemTheme,
} from './theme'
import type { ResolvedTheme, Theme } from './theme'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// keeps consumers and open tabs in sync
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)

  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', onStorage)
  const unsubscribeSystem = subscribeToSystemTheme(onChange)

  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
    unsubscribeSystem()
  }
}

function emit() {
  listeners.forEach((listener) => listener())
}

// no window on server; the init script already set the real class before
// hydration, so these only seed react state and never repaint
const getServerTheme = (): Theme => 'system'
const getServerResolved = (): ResolvedTheme => 'light'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readStoredTheme, getServerTheme)
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    () => resolveTheme(readStoredTheme()),
    getServerResolved,
  )

  // setTheme only flags this; the effect below is the sole painter. painting
  // from setTheme too would race the view transition and capture the new theme
  const animateNextPaint = useRef(false)

  useEffect(() => {
    const animate = animateNextPaint.current
    animateNextPaint.current = false
    applyTheme(resolvedTheme, animate)
  }, [resolvedTheme])

  const setTheme = useCallback((next: Theme) => {
    if (!isTheme(next)) return

    // read before writing: after this the store already holds next
    const before = resolveTheme(readStoredTheme())

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // storage unavailable: applies for this session only
    }

    // only animate if what's on screen will actually change
    animateNextPaint.current = resolveTheme(next) !== before
    emit()
  }, [])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}