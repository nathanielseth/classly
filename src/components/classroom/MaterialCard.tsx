import {
  FileText,
  Trash2,
  Paperclip,
  Download,
  Clock,
  Edit,
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
}

const TYPE_COLORS: Record<string, { bg: string; text: string; badge: string }> =
  {
    assignment: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      badge: 'bg-blue-50 text-blue-700',
    },
    quiz: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      badge: 'bg-purple-50 text-purple-700',
    },
    exam: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      badge: 'bg-red-50 text-red-700',
    },
    project: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      badge: 'bg-green-50 text-green-700',
    },
    module: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      badge: 'bg-indigo-50 text-indigo-700',
    },
    material: {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      badge: 'bg-gray-50 text-gray-700',
    },
  }

export function MaterialCard({
  material,
  canManage,
  onClick,
  onEdit,
  onDelete,
}: MaterialCardProps) {
  const dueDate = material.due_date ? new Date(material.due_date) : null
  const isOverdue = dueDate ? dueDate < new Date() : false
  const colors =
    TYPE_COLORS[material.type ?? 'assignment'] ?? TYPE_COLORS.assignment

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    onClick?.(material)
  }

  return (
    <div
      onClick={handleCardClick}
      className="group p-4 hover:bg-gray-50 transition-all cursor-pointer border-l-4 border-transparent hover:border-classly-green"
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
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-classly-green transition-colors">
                  {material.title}
                </h3>
                {canManage && !material.published && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide text-amber-700 bg-amber-50 shrink-0">
                    Draft
                  </span>
                )}
              </div>
              {material.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
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
                  className="p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.()
                  }}
                  className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
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
                    ? 'text-red-700 bg-red-50'
                    : 'text-orange-700 bg-orange-50'
                }`}
              >
                <Clock size={12} />
                {isOverdue
                  ? 'Overdue'
                  : `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </div>
            )}

            {material.max_points !== null && material.max_points > 0 && (
              <span className="text-xs text-gray-600 font-medium">
                {material.max_points} points
              </span>
            )}

            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge} capitalize`}
            >
              {material.type}
            </span>

            {material.created_at && !dueDate && (
              <span className="text-xs text-gray-500">
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
                className="ml-auto flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-all"
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