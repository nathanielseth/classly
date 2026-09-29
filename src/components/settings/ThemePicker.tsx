import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme/ThemeProvider'
import type { Theme } from '@/lib/theme/theme'

const OPTIONS: Array<{ value: Theme; label: string; description: string }> = [
  { value: 'light', label: 'Light', description: 'Bright and paper-like.' },
  { value: 'dark', label: 'Dark', description: 'Easy on the eyes at night.' },
  {
    value: 'system',
    label: 'System',
    description: 'Match your device setting.',
  },
]

export function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
    >
      {OPTIONS.map(({ value, label, description }) => {
        const selected = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={cn(
              'group rounded-xl border p-2 text-left transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              selected
                ? 'border-primary ring-1 ring-primary'
                : 'border-border hover:border-muted-foreground/40',
            )}
          >
            <ThemePreview mode={value} />
            <div className="flex items-start justify-between gap-2 px-1 pt-3 pb-1">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </p>
              </div>
              <span
                className={cn(
                  'mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border',
                )}
              >
                {selected && <Check size={11} strokeWidth={3} />}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// fixed hex on purpose: a preview must show the theme it represents, not the
// active one, so it can't use tokens
const PALETTE = {
  light: {
    canvas: '#f7f5f0',
    card: '#ffffff',
    border: '#e5e0d4',
    text: '#262320',
    muted: '#c9c3b5',
    primary: '#3a6b4a',
  },
  dark: {
    canvas: '#16140f',
    card: '#1e1c17',
    border: '#34312a',
    text: '#ece8df',
    muted: '#4a463c',
    primary: '#6fa383',
  },
} as const

function ThemePreview({ mode }: { mode: Theme }) {
  if (mode === 'system') {
    // diagonal split shows both palettes at once
    return (
      <div className="relative h-24 overflow-hidden rounded-lg border border-border">
        <div className="absolute inset-0">
          <MiniApp palette={PALETTE.light} />
        </div>
        <div
          className="absolute inset-0"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
        >
          <MiniApp palette={PALETTE.dark} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-24 overflow-hidden rounded-lg border border-border">
      <MiniApp palette={PALETTE[mode]} />
    </div>
  )
}

function MiniApp({
  palette,
}: {
  palette: (typeof PALETTE)[keyof typeof PALETTE]
}) {
  return (
    <div
      className="flex h-full"
      style={{ backgroundColor: palette.canvas }}
      aria-hidden="true"
    >
      <div
        className="w-1/4 space-y-1.5 border-r p-2"
        style={{ backgroundColor: palette.card, borderColor: palette.border }}
      >
        <div
          className="h-1.5 w-full rounded-full"
          style={{ backgroundColor: palette.primary }}
        />
        <div
          className="h-1.5 w-3/4 rounded-full"
          style={{ backgroundColor: palette.muted }}
        />
        <div
          className="h-1.5 w-2/3 rounded-full"
          style={{ backgroundColor: palette.muted }}
        />
      </div>
      <div className="flex-1 p-2.5">
        <div
          className="mb-2 h-1.5 w-1/3 rounded-full"
          style={{ backgroundColor: palette.text }}
        />
        <div
          className="space-y-1.5 rounded-md border p-2"
          style={{ backgroundColor: palette.card, borderColor: palette.border }}
        >
          <div
            className="h-1.5 w-full rounded-full"
            style={{ backgroundColor: palette.muted }}
          />
          <div
            className="h-1.5 w-4/5 rounded-full"
            style={{ backgroundColor: palette.muted }}
          />
          <div
            className="mt-1 h-3 w-1/3 rounded"
            style={{ backgroundColor: palette.primary }}
          />
        </div>
      </div>
    </div>
  )
}