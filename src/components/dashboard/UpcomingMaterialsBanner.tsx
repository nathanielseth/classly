interface UpcomingMaterial {
  id: string
  title: string
  due_date: string | null
  subject: { code: string } | null
}

interface UpcomingMaterialsBannerProps {
  materials: UpcomingMaterial[]
}

type Urgency = 'today' | 'tomorrow' | 'later'

function getUrgency(dueDate: Date): Urgency {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (dueDate.toDateString() === today.toDateString()) return 'today'
  if (dueDate.toDateString() === tomorrow.toDateString()) return 'tomorrow'
  return 'later'
}

function dueLabel(dueDate: Date, urgency: Urgency) {
  if (urgency === 'today') return 'Today'
  if (urgency === 'tomorrow') return 'Tomorrow'
  return dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const URGENCY_TEXT: Record<Urgency, string> = {
  today: 'text-destructive font-medium',
  tomorrow: 'text-warning font-medium',
  later: 'text-muted-foreground',
}

export function UpcomingMaterialsBanner({
  materials,
}: UpcomingMaterialsBannerProps) {
  const dated = materials
    .filter((m): m is UpcomingMaterial & { due_date: string } => !!m.due_date)
    .slice(0, 3)

  if (dated.length === 0) return null

  return (
    <section aria-labelledby="due-soon-heading">
      <h2
        id="due-soon-heading"
        className="mb-2 text-sm font-medium text-foreground"
      >
        Due soon
      </h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {dated.map((material) => {
          const dueDate = new Date(material.due_date)
          const urgency = getUrgency(dueDate)
          return (
            <li
              key={material.id}
              className="flex items-baseline justify-between gap-4 px-4 py-2.5"
            >
              <span className="min-w-0 truncate text-sm text-foreground">
                {material.title}
                {material.subject?.code && (
                  <span className="text-muted-foreground">
                    {' '}
                    · {material.subject.code}
                  </span>
                )}
              </span>
              <time
                dateTime={dueDate.toISOString()}
                className={`shrink-0 text-sm tabular-nums ${URGENCY_TEXT[urgency]}`}
              >
                {dueLabel(dueDate, urgency)}
              </time>
            </li>
          )
        })}
      </ul>
    </section>
  )
}