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
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="h-2 bg-classly-green" />
      <div className="p-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide text-classly-green bg-green-50">
                {subject.code}
              </span>
              {subject.archived && (
                <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide text-gray-500 bg-gray-100">
                  Archived
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
            {subject.description && (
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                {subject.description}
              </p>
            )}
          </div>

          <div className="text-sm text-gray-500 space-y-1 shrink-0">
            {subject.instructor && (
              <p className="font-medium text-gray-700">
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