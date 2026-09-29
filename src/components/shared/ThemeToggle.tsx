import { useRef, useState } from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useTheme } from '@/lib/theme/ThemeProvider'
import type { Theme } from '@/lib/theme/theme'

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside(ref, () => setOpen(false))

  // the trigger shows what is rendering NOW, not the stored preference, so
  // "system" on a dark OS correctly shows a moon
  const TriggerIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <TriggerIcon size={20} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-float"
        >
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = theme === value
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  active
                    ? 'bg-secondary font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                <Icon size={15} />
                <span className="flex-1 text-left">{label}</span>
                {active && <Check size={14} className="text-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
