import {
  FileText,
  Trash2,
  Paperclip,
  Download,
  Clock,
  Edit,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

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

const TYPE_COLORS: Record<string, { bg: string; text: string; badge: string }> =
  {
    assignment: {
      bg: 'bg-info/8',
      text: 'text-info',
      badge: 'bg-info/8 text-info',
    },
    quiz: {
      bg: 'bg-chart-4/10',
      text: 'text-chart-4',
      badge: 'bg-chart-4/10 text-chart-4',
    },
    exam: {
      bg: 'bg-destructive/8',
      text: 'text-destructive',
      badge: 'bg-destructive/8 text-destructive',
    },
    project: {
      bg: 'bg-success/8',
      text: 'text-success',
      badge: 'bg-success/8 text-success',
    },
    module: {
      bg: 'bg-chart-6/10',
      text: 'text-chart-6',
      badge: 'bg-chart-6/10 text-chart-6',
    },
    material: {
      bg: 'bg-secondary',
      text: 'text-muted-foreground',
      badge: 'bg-secondary text-foreground/80',
    },
  }

const SUBMITTABLE_TYPES = new Set(['assignment', 'quiz', 'exam', 'project'])

function submissionBadge(
  submission: MaterialCardProps['submission'],
  dueDate: Date | null,
): { label: string; className: string; icon: typeof CheckCircle2 } {
  if (!submission) {
    const overdue = dueDate ? dueDate < new Date() : false
    return overdue
      ? {
          label: 'Missing',
          className: 'text-destructive bg-destructive/8',
          icon: AlertCircle,
        }
      : {
          label: 'Not submitted',
          className: 'text-muted-foreground bg-muted',
          icon: Clock,
        }
  }

  if (submission.status === 'graded' || submission.status === 'returned') {
    return {
      label:
        submission.grade !== null ? `Graded · ${submission.grade}` : 'Graded',
      className: 'text-success bg-success/8',
      icon: CheckCircle2,
    }
  }

  return submission.is_late
    ? {
        label: 'Turned in late',
        className: 'text-warning bg-warning/8',
        icon: CheckCircle2,
      }
    : {
        label: 'Turned in',
        className: 'text-info bg-info/8',
        icon: CheckCircle2,
      }
}

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
  const colors =
    TYPE_COLORS[material.type ?? 'assignment'] ?? TYPE_COLORS.assignment
  const showSubmissionBadge =
    !canManage && material.type && SUBMITTABLE_TYPES.has(material.type)
  const badge = showSubmissionBadge
    ? submissionBadge(submission, dueDate)
    : null

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    onClick?.(material)
  }

  return (
    <div
      onClick={handleCardClick}
      className="group p-4 hover:bg-secondary transition-all cursor-pointer border-l-4 border-transparent hover:border-classly-green"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
        >
          <FileText size={18} className={colors.text} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-classly-green transition-colors">
                  {material.title}
                </h3>
                {canManage && !material.published && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide text-warning bg-warning/8 shrink-0">
                    Draft
                  </span>
                )}
              </div>
              {material.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {material.description}
                </p>
              )}
            </div>

            {canManage && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.()
                  }}
                  className="p-1.5 text-muted-foreground/70 hover:bg-info/8 hover:text-info rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.()
                  }}
                  className="p-1.5 text-muted-foreground/70 hover:bg-destructive/8 hover:text-destructive rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {dueDate && (
              <div
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                  isOverdue
                    ? 'text-destructive bg-destructive/8'
                    : 'text-warning bg-warning/8'
                }`}
              >
                <Clock size={12} />
                {isOverdue
                  ? 'Overdue'
                  : `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </div>
            )}

            {badge && (
              <div
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}
              >
                <badge.icon size={12} />
                {badge.label}
              </div>
            )}

            {material.max_points !== null && material.max_points > 0 && (
              <span className="text-xs text-muted-foreground font-medium">
                {material.max_points} points
              </span>
            )}

            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge} capitalize`}
            >
              {material.type}
            </span>

            {material.created_at && !dueDate && (
              <span className="text-xs text-muted-foreground">
                Posted{' '}
                {new Date(material.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}

            {material.file_url && (
              <a
                href={material.file_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto flex items-center gap-1.5 text-xs font-medium text-info hover:brightness-110 bg-info/8 hover:bg-info/12 px-2.5 py-1 rounded-full transition-all"
              >
                <Paperclip size={12} />
                <span>Attachment</span>
                <Download size={12} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}