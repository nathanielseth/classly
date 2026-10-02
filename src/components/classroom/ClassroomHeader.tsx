import { Link } from '@tanstack/react-router'
import { ArrowLeft, Calendar, DoorOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClassroomHeaderProps {
  subject: {
    code: string
    name: string
    description: string | null
    schedule: string | null
    room: string | null
    archived: boolean
    instructor: { full_name: string } | null
  }
}

const IDENTITY_COLORS = [
  'bg-classly-green',
  'bg-classly-gold',
  'bg-info',
  'bg-chart-4',
  'bg-chart-5',
  'bg-destructive',
]

function identityColor(code: string) {
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) | 0
  }
  return IDENTITY_COLORS[Math.abs(hash) % IDENTITY_COLORS.length]
}

export function ClassroomHeader({ subject }: ClassroomHeaderProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div
        aria-hidden
        className={cn(
          'h-2',
          subject.archived ? 'bg-muted' : identityColor(subject.code),
        )}
      />
      <div className="p-6">
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 rounded-xs text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to dashboard
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {subject.code}
              {subject.archived && (
                <>
                  <span aria-hidden> · </span>
                  Archived
                </>
              )}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              {subject.name}
            </h1>
            {subject.description && (
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                {subject.description}
              </p>
            )}
          </div>

        {(subject.instructor || subject.schedule || subject.room) && (
          <div className="shrink-0 space-y-1 text-sm text-muted-foreground">
            {subject.instructor && (
              <p className="font-medium text-foreground">
                {subject.instructor.full_name}
              </p>
            )}
            {subject.schedule && (
              <p className="flex items-center justify-end gap-1.5">
                <Calendar className="size-3.5" aria-hidden />
                {subject.schedule}
              </p>
            )}
            {subject.room && (
              <p className="flex items-center justify-end gap-1.5">
                <DoorOpen className="size-3.5" aria-hidden />
                {subject.room}
              </p>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}