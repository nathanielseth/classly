import { createFileRoute } from '@tanstack/react-router'
import { LifeBuoy } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/help')({
  component: HelpPage,
})

function HelpPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <LifeBuoy size={22} />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">Help</h1>
        <p className="text-sm text-muted-foreground">
          Support resources and documentation are coming soon.
        </p>
      </div>
    </div>
  )
}