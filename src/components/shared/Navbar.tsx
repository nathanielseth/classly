import { useRef, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  ChevronDown,
  GraduationCap,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { getNotifications } from '@/lib/server/functions/notifications'
import { signOut } from '@/lib/server/functions/auth-actions'
import { getInitials } from '@/components/ui/avatar'
import { useClickOutside } from '@/hooks/useClickOutside'

interface NavbarProps {
  profile: {
    full_name: string
    email: string
    role: 'student' | 'instructor' | 'admin'
  }
}

const NOTIF_DOT_COLOR: Record<string, string> = {
  announcement: 'bg-primary',
  submission: 'bg-blue-500',
  pending: 'bg-warning',
}

function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return ''
  const diffSeconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000,
  )
  if (diffSeconds < 60) return 'just now'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`
  return `${Math.floor(diffSeconds / 86400)}d ago`
}

export function Navbar({ profile }: NavbarProps) {
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useClickOutside(notifRef, () => setNotifOpen(false))
  useClickOutside(profileRef, () => setProfileOpen(false))

  // only fetches once the bell is opened - a background poll here would
  // burn a query per navbar mount across every page in the app
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
    enabled: notifOpen,
  })

  const notifications = notificationsQuery.data?.items ?? []

  const handleSignOut = async () => {
    await signOut()
    await router.invalidate()
    router.navigate({ to: '/login' })
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-5">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-4.5" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            Classly
          </span>
        </div>

        <Link
          to="/ai"
          className="hidden items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted sm:flex"
        >
          <Sparkles size={14} className="text-classly-gold" />
          Ask AI
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell size={20} />
            {notifOpen && notifications.length > 0 && (
              <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full border-2 border-card bg-destructive text-[10px] font-bold text-destructive-foreground">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-float">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <span className="text-xs text-muted-foreground">
                  {notificationsQuery.isPending
                    ? 'Loading…'
                    : notifications.length === 0
                      ? 'All caught up'
                      : `${notifications.length} items`}
                </span>
              </div>
              <div className="max-h-80 divide-y divide-border/60 overflow-y-auto">
                {notificationsQuery.isPending ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Loading…
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nothing new right now
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex gap-3">
                        <div
                          className={cn(
                            'mt-1.5 size-2 shrink-0 rounded-full',
                            NOTIF_DOT_COLOR[item.type] ?? 'bg-muted-foreground',
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {item.body}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground/70">
                            {formatRelativeTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-transparent py-1 pr-1 pl-2 transition-colors hover:border-border hover:bg-muted"
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary select-none">
              {getInitials(profile.full_name)}
            </div>
            <ChevronDown
              size={14}
              className={cn(
                'mr-1 text-muted-foreground transition-transform duration-200',
                profileOpen && 'rotate-180',
              )}
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-float">
              <div className="border-b border-border p-4">
                <p className="font-semibold text-foreground">
                  {profile.full_name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {profile.email}
                </p>
                <p className="mt-1 text-xs font-medium text-primary capitalize">
                  {profile.role}
                </p>
              </div>
              <div className="py-2">
                <Link
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <Settings size={16} />
                  Account Settings
                </Link>
              </div>
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/5"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}