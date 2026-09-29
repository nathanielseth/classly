import { Link } from '@tanstack/react-router'
import { ArrowLeft, Calendar, DoorOpen } from 'lucide-react'

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

export function ClassroomHeader({ subject }: ClassroomHeaderProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="h-2 bg-classly-green" />
      <div className="p-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground/80 mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide text-classly-green bg-success/8">
                {subject.code}
              </span>
              {subject.archived && (
                <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide text-muted-foreground bg-muted">
                  Archived
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{subject.name}</h1>
            {subject.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {subject.description}
              </p>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-1 shrink-0">
            {subject.instructor && (
              <p className="font-medium text-foreground/80">
                {subject.instructor.full_name}
              </p>
            )}
            {subject.schedule && (
              <p className="flex items-center gap-1.5 justify-end">
                <Calendar size={13} />
                {subject.schedule}
              </p>
            )}
            {subject.room && (
              <p className="flex items-center gap-1.5 justify-end">
                <DoorOpen size={13} />
                {subject.room}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}