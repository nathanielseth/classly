import { GraduationCap } from 'lucide-react'

export function Navbar() {
  return (
    <header className="flex h-16 shrink-0 items-center border-b border-border bg-card px-5">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-4.5" />
        </div>
        <span className="text-base font-semibold tracking-tight text-foreground">
          Classly
        </span>
      </div>
    </header>
  )
}