import { getInitial } from './format'
import type { GroupMemberItem } from '@/lib/server/functions/messages'

interface MembersPanelProps {
  members: Array<GroupMemberItem>
}

export function MembersPanel({ members }: MembersPanelProps) {
  return (
    <div className="w-56 border-l border-border bg-secondary flex flex-col shrink-0">
      <div className="p-3 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Members ({members.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
              {getInitial(m.profile?.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {m.profile?.full_name}
              </p>
              {m.is_admin && (
                <p className="text-[10px] text-chart-4 font-medium">Instructor</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}