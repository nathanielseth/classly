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
    wrap: 'bg-destructive/8 border-destructive/20 hover:bg-destructive/12',
    title: 'group-hover:text-destructive',
    badge: 'text-destructive bg-destructive/12',
  },
  tomorrow: {
    wrap: 'bg-warning/8 border-warning/20 hover:bg-warning/12',
    title: 'group-hover:text-warning',
    badge: 'text-warning bg-warning/12',
  },
  upcoming: {
    wrap: 'bg-info/8 border-info/20 hover:bg-info/12',
    title: 'group-hover:text-info',
    badge: 'text-info bg-info/12',
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
      <div className="bg-success/8 border border-success/20 rounded-lg px-4 py-3 flex items-center gap-2">
        <Check size={16} className="text-success" />
        <span className="text-sm text-success font-medium">
          All caught up! No upcoming assignments.
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                className={`text-sm font-semibold text-foreground transition-colors ${styles.title}`}
              >
                {material.title}
              </span>
              {subjectCode && (
                <>
                  <span className="text-xs text-muted-foreground/70">•</span>
                  <span className="text-xs text-muted-foreground">{subjectCode}</span>
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