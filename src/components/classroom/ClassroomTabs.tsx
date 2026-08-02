import { MessageSquare, BookOpen, Users } from 'lucide-react'

export type ClassroomTab = 'stream' | 'materials' | 'people'

interface ClassroomTabsProps {
  active: ClassroomTab
  onChange: (tab: ClassroomTab) => void
}

const TABS: {
  id: ClassroomTab
  label: string
  icon: typeof MessageSquare
}[] = [
  { id: 'stream', label: 'Stream', icon: MessageSquare },
  { id: 'materials', label: 'Materials', icon: BookOpen },
  { id: 'people', label: 'People', icon: Users },
]

export function ClassroomTabs({ active, onChange }: ClassroomTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = active === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-classly-green text-classly-green'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}