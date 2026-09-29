export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'classly-theme'
export const THEMES: ReadonlyArray<Theme> = ['light', 'dark', 'system']

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    // storage blocked (private mode, disabled cookies); fall back to os
    return 'system'
  }
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function paintTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

export function applyTheme(resolved: ResolvedTheme, animate: boolean) {
  const canAnimate =
    animate &&
    typeof document.startViewTransition === 'function' &&
    !prefersReducedMotion()

  if (!canAnimate) {
    paintTheme(resolved)
    return
  }

  document.startViewTransition(() => paintTheme(resolved))
}

export function subscribeToSystemTheme(onChange: () => void) {
  const mql = window.matchMedia(DARK_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

// runs inline in <head> before first paint to avoid a theme flash
export const themeInitScript = `(function(){var t='system';try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(s==='light'||s==='dark'||s==='system')t=s;}catch(e){}var d=false;try{d=t==='dark'||(t==='system'&&window.matchMedia('${DARK_QUERY}').matches);}catch(e){}var r=document.documentElement;if(d)r.classList.add('dark');r.style.colorScheme=d?'dark':'light';})();`