import { MessageSquare, BookOpen, Users } from 'lucide-react'

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsIndicator,
} from '@/components/ui/tabs'

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
    <Tabs value={active} onValueChange={(value) => onChange(value as ClassroomTab)}>
      <TabsList>
        <TabsIndicator />
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <TabsTrigger key={tab.id} value={tab.id}>
              <Icon size={16} />
              {tab.label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}