import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Home,
  Bot,
  BookOpen,
  Calendar,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Settings,
  LifeBuoy,
  LogOut,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { signOut } from '@/lib/server/functions/auth-actions'
import { listSubjects } from '@/lib/server/functions/subjects'
import { getInitials } from '@/components/ui/avatar'

interface SidebarProps {
  aiNavDisabled: boolean
  role: 'student' | 'instructor' | 'admin'
  fullName: string
}

const mainNavItems: Array<{
  to: '/dashboard' | '/ai' | '/calendar' | '/messages' | '/admin/users'
  label: string
  icon: typeof Home
  lockable?: boolean
  adminOnly?: boolean
}> = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/ai', label: 'AI Assistant', icon: Bot, lockable: true },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
]

const utilityNavItems: Array<{
  to: '/settings' | '/help'
  label: string
  icon: typeof Settings
}> = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/help', label: 'Help', icon: LifeBuoy },
]

const roleLabel: Record<SidebarProps['role'], string> = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Admin',
}

export function Sidebar({ aiNavDisabled, role, fullName }: SidebarProps) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useLocalStorage(
    'classly:sidebar-collapsed',
    false,
  )
  const [subjectsExpanded, setSubjectsExpanded] = useState(true)

  const items = mainNavItems.filter(
    (item) => !item.adminOnly || role === 'admin',
  )

  const showSubjectsSection = role === 'student' || role === 'instructor'

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'list', { includeArchived: false }],
    queryFn: () => listSubjects({ data: { includeArchived: false } }),
    enabled: showSubjectsSection && !collapsed,
  })
  const subjects = subjectsQuery.data?.subjects ?? []
  const subjectsLabel = role === 'instructor' ? 'My Subjects' : 'Enrolled'

  const handleLogout = async () => {
    await signOut()
    router.navigate({ to: '/login' })
  }

  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out',
        collapsed ? 'w-19' : 'w-64',
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute top-5 -right-3 z-10 flex size-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground shadow-soft transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <nav className="flex-1 space-y-1 p-3 pt-6">
        {items.map((item) => {
          const isLocked = item.lockable && aiNavDisabled
          const Icon = item.icon

          if (isLocked) {
            return (
              <div
                key={item.to}
                title="Unavailable during an active quiz"
                className={cn(
                  navItemBase,
                  'cursor-not-allowed hover:bg-transparent',
                  collapsed && 'justify-center px-0',
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/40">
                  <Icon size={18} />
                </span>
                {!collapsed && (
                  <span className="text-muted-foreground/40 select-none">
                    {item.label}
                  </span>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={cn(navItemBase, collapsed && 'justify-center px-0')}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  {!collapsed && (
                    <span
                      className={cn(
                        'text-foreground/70',
                        isActive && 'font-medium text-foreground',
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}

        {showSubjectsSection && !collapsed && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setSubjectsExpanded((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent"
            >
              <span className="flex items-center gap-3">
                <BookOpen size={18} className="shrink-0" />
                <span className="font-medium">{subjectsLabel}</span>
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  'transition-transform duration-200',
                  !subjectsExpanded && '-rotate-90',
                )}
              />
            </button>

            {subjectsExpanded && (
              <div className="mt-1 space-y-0.5">
                {subjectsQuery.isPending ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2
                      size={16}
                      className="animate-spin text-muted-foreground/50"
                    />
                  </div>
                ) : subjects.length === 0 ? (
                  <p className="px-3 py-2 text-center text-xs text-muted-foreground/60">
                    {role === 'instructor'
                      ? 'No subjects created'
                      : 'No enrollments'}
                  </p>
                ) : (
                  subjects.map((subject) => (
                    <Link
                      key={subject.id}
                      to="/classroom/$subjectId"
                      params={{ subjectId: subject.id }}
                      title={subject.name}
                      className="flex items-center gap-3 rounded-lg py-2 pr-3 pl-9 text-sm text-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-foreground"
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span className="truncate">{subject.name}</span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {utilityNavItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={cn(navItemBase, collapsed && 'justify-center px-0')}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  {!collapsed && (
                    <span
                      className={cn(
                        'text-foreground/70',
                        isActive && 'font-medium text-foreground',
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            'flex items-center gap-2.5 px-1 py-1.5',
            collapsed && 'justify-center px-0',
          )}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary select-none">
            {getInitials(fullName)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {fullName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel[role]}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

const navItemBase =
  'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-sidebar-accent'