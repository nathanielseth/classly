import { FileText, Trash2, Paperclip, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MaterialCardProps {
  material: {
    id: string
    title: string
    description: string | null
    type: string | null
    due_date: string | null
    max_points: number | null
    file_url: string | null
    created_at: string | null
    published: boolean | null
  }
  canManage: boolean
  onClick?: (material: MaterialCardProps['material']) => void
  onEdit?: () => void
  onDelete?: () => void
  submission?: {
    status: string | null
    grade: number | null
    is_late: boolean | null
  } | null
}

const SUBMITTABLE_TYPES = new Set(['assignment', 'quiz', 'exam', 'project'])

function status(
  material: MaterialCardProps['material'],
  submission: MaterialCardProps['submission'],
  dueDate: Date | null,
  canManage: boolean,
): { label: string; tone: 'danger' | 'warning' | 'neutral' } | null {
  if (canManage) return null
  if (!material.type || !SUBMITTABLE_TYPES.has(material.type)) return null

  if (submission?.status === 'graded' || submission?.status === 'returned') {
    return {
      label: submission.grade !== null ? `Graded · ${submission.grade}` : 'Graded',
      tone: 'neutral',
    }
  }
  if (submission) {
    return {
      label: submission.is_late ? 'Turned in late' : 'Turned in',
      tone: submission.is_late ? 'warning' : 'neutral',
    }
  }
  const overdue = dueDate ? dueDate < new Date() : false
  return overdue
    ? { label: 'Missing', tone: 'danger' }
    : { label: 'Not submitted', tone: 'neutral' }
}

const STATUS_TEXT = {
  danger: 'text-destructive',
  warning: 'text-warning',
  neutral: 'text-muted-foreground',
} as const

export function MaterialCard({
  material,
  canManage,
  onClick,
  onEdit,
  onDelete,
  submission,
}: MaterialCardProps) {
  const dueDate = material.due_date ? new Date(material.due_date) : null
  const isOverdue = dueDate ? dueDate < new Date() : false
  const materialStatus = status(material, submission, dueDate, canManage)

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onClick?.(material)}
        className="flex w-full items-start gap-3 rounded-md p-3 pr-20 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <FileText
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-foreground">
              {material.title}
            </h3>
            {canManage && !material.published && (
              <span className="shrink-0 text-xs text-muted-foreground">
                Draft
              </span>
            )}
          </div>

          {material.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {material.description}
            </p>
          )}

          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground capitalize">
            <span>{material.type}</span>
            {material.max_points !== null && material.max_points > 0 && (
              <span>· {material.max_points} pts</span>
            )}
            {dueDate && (
              <span className={isOverdue ? 'text-destructive' : undefined}>
                · {isOverdue ? 'Overdue' : 'Due'}{' '}
                {dueDate.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {!dueDate && material.created_at && (
              <span>
                · Posted{' '}
                {new Date(material.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {materialStatus && (
              <span className={STATUS_TEXT[materialStatus.tone]}>
                · {materialStatus.label}
              </span>
            )}
            {material.file_url && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="size-3" aria-hidden />
                Attachment
              </span>
            )}
          </p>
        </div>
      </button>

      {canManage && (
        <div
          className={cn(
            'absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100',
            'group-focus-within:opacity-100',
          )}
        >
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${material.title}`}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Edit className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${material.title}`}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}