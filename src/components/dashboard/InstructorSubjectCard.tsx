import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  MoreVertical,
  Pencil,
  Users,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface InstructorSubjectCardProps {
  subject: {
    id: string
    code: string
    name: string
    description: string | null
    schedule: string | null
    room: string | null
    archived: boolean
    enrollmentCount: number
    materialCount: number
  }
  onToggleArchive: (subjectId: string, archived: boolean) => void
  isToggling: boolean
  onEdit: () => void
}

export function InstructorSubjectCard({
  subject,
  onToggleArchive,
  isToggling,
  onEdit,
}: InstructorSubjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyCode = () => {
    void navigator.clipboard.writeText(subject.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border border-t-4 bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-float',
        subject.archived
          ? 'border-t-muted-foreground/30 opacity-70'
          : 'border-t-classly-green',
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 rounded bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          {subject.code}
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-float">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit()
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onToggleArchive(subject.id, !subject.archived)
                  }}
                  disabled={isToggling}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
                >
                  {subject.archived ? (
                    <ArchiveRestore size={14} />
                  ) : (
                    <Archive size={14} />
                  )}
                  {subject.archived ? 'Unarchive' : 'Archive'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Link
        to="/classroom/$subjectId"
        params={{ subjectId: subject.id }}
        className="block"
      >
        <h3 className="mb-4 line-clamp-1 font-semibold text-foreground transition-colors hover:text-primary">
          {subject.name}
        </h3>

        <div className="flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users size={13} />
            {subject.enrollmentCount} students
          </span>
          <span className="flex items-center gap-1">
            <BookOpen size={13} />
            {subject.materialCount} materials
          </span>
        </div>
      </Link>
    </div>
  )
}