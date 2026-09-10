import { Check, CheckCircle } from 'lucide-react'

interface UpcomingMaterial {
  id: string
  title: string
  due_date: string | null
  subject: { code: string } | null
}

interface UpcomingMaterialsBannerProps {
  materials: UpcomingMaterial[]
}

const URGENCY_STYLES = {
  today: {
    wrap: 'bg-red-50 border-red-100 hover:bg-red-100',
    title: 'group-hover:text-red-700',
    badge: 'text-red-600 bg-red-100',
  },
  tomorrow: {
    wrap: 'bg-orange-50 border-orange-100 hover:bg-orange-100',
    title: 'group-hover:text-orange-700',
    badge: 'text-orange-600 bg-orange-100',
  },
  upcoming: {
    wrap: 'bg-yellow-50 border-yellow-100 hover:bg-yellow-100',
    title: 'group-hover:text-yellow-700',
    badge: 'text-yellow-600 bg-yellow-100',
  },
} as const

function getUrgency(dueDate: Date): keyof typeof URGENCY_STYLES {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (dueDate.toDateString() === today.toDateString()) return 'today'
  if (dueDate.toDateString() === tomorrow.toDateString()) return 'tomorrow'
  return 'upcoming'
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function UpcomingMaterialsBanner({
  materials,
}: UpcomingMaterialsBannerProps) {
  if (materials.length === 0) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 flex items-center gap-2">
        <Check size={16} className="text-green-600" />
        <span className="text-sm text-green-700 font-medium">
          All caught up! No upcoming assignments.
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <CheckCircle size={16} className="text-classly-green" />
        <span className="font-medium">Due soon:</span>
      </div>

      {materials.slice(0, 3).map((material) => {
        if (!material.due_date) return null
        const dueDate = new Date(material.due_date)
        const urgency = getUrgency(dueDate)
        const styles = URGENCY_STYLES[urgency]
        const subjectCode = material.subject?.code

        return (
          <div
            key={material.id}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors group ${styles.wrap}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold text-gray-900 transition-colors ${styles.title}`}
              >
                {material.title}
              </span>
              {subjectCode && (
                <>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{subjectCode}</span>
                </>
              )}
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${styles.badge}`}
            >
              {urgency === 'today'
                ? 'Today'
                : urgency === 'tomorrow'
                  ? 'Tomorrow'
                  : formatDate(dueDate)}
            </span>
          </div>
        )
      })}
    </div>
  )
}