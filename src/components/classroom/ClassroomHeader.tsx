import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Calendar, DoorOpen, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

interface ClassroomHeaderProps {
  subject: {
    code: string
    name: string
    description: string | null
    schedule: string | null
    room: string | null
    meeting_url: string | null
    archived: boolean
    instructor: { full_name: string } | null
  }
  actions?: ReactNode
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

export function ClassroomHeader({ subject, actions }: ClassroomHeaderProps) {
  const showMeeting = subject.meeting_url && !subject.archived
  const hasMeta = subject.instructor || subject.schedule || subject.room

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div
        aria-hidden
        className={cn(
          'h-2',
          subject.archived ? 'bg-muted' : identityColor(subject.code),
        )}
      />
      <div className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xs text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to dashboard
          </Link>
          {actions}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 space-y-3">
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

            {hasMeta && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {subject.instructor && (
                  <span className="font-medium text-foreground">
                    {subject.instructor.full_name}
                  </span>
                )}
                {subject.schedule && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5" aria-hidden />
                    {subject.schedule}
                  </span>
                )}
                {subject.room && (
                  <span className="inline-flex items-center gap-1.5">
                    <DoorOpen className="size-3.5" aria-hidden />
                    {subject.room}
                  </span>
                )}
              </div>
            )}
          </div>

          {showMeeting && (
            <a
              href={subject.meeting_url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants()}
            >
              <Video aria-hidden />
              Join class meeting
            </a>
          )}
        </div>
      </div>
    </div>
  )
}