import type { ComponentType } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  getRecentUsers,
  getSystemStats,
  getWeeklyActivity,
} from '@/lib/server/functions/admin-dashboard'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, getInitials } from '@/components/ui/avatar'

export function AdminDashboardView() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: () => getSystemStats(),
  })
  const recentUsersQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'recent-users'],
    queryFn: () => getRecentUsers(),
  })
  const activityQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'weekly-activity'],
    queryFn: () => getWeeklyActivity(),
  })

  const stats = statsQuery.data
  const recentUsers = recentUsersQuery.data?.users ?? []
  const activity = activityQuery.data

  const usersSearch = { role: 'all' as const, status: 'all' as const, page: 1 }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage users and monitor platform activity
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          loading={statsQuery.isLoading}
          accent="info"
        />
        <StatCard
          icon={GraduationCap}
          label="Students"
          value={stats?.totalStudents ?? 0}
          subtitle={
            stats && stats.totalUsers > 0
              ? `${Math.round((stats.totalStudents / stats.totalUsers) * 100)}% of users`
              : undefined
          }
          loading={statsQuery.isLoading}
          accent="primary"
        />
        <StatCard
          icon={UserCheck}
          label="Instructors"
          value={stats?.totalInstructors ?? 0}
          subtitle={stats ? `${stats.totalSubjects} subjects` : undefined}
          loading={statsQuery.isLoading}
          accent="accent"
        />
        <StatCard
          icon={BookOpen}
          label="Active Subjects"
          value={stats?.totalSubjects ?? 0}
          loading={statsQuery.isLoading}
          accent="muted"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Recent Users</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Latest registrations
              </p>
            </div>
            <Link
              to="/admin/users"
              search={usersSearch}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-1">
            {recentUsersQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex animate-pulse gap-3">
                    <div className="size-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="h-3 w-48 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No users yet</p>
              </div>
            ) : (
              recentUsers.map((user) => (
                <Link
                  key={user.id}
                  to="/admin/users"
                  search={usersSearch}
                  className="group flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(user.full_name ?? user.email ?? '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {user.full_name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {user.role}
                    </span>
                    <ArrowRight
                      size={16}
                      className="text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Quick Actions</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Common tasks</p>
          </div>

          <div className="space-y-2">
            <Link
              to="/admin/users"
              search={usersSearch}
              className="group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
            >
              <div className="rounded-lg bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary/20">
                <Users size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Manage Users
                </p>
                <p className="text-xs text-muted-foreground">
                  View, approve, edit accounts
                </p>
              </div>
              <ArrowRight
                size={16}
                className="text-muted-foreground/50 group-hover:text-muted-foreground"
              />
            </Link>

            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 text-xs text-muted-foreground">
                System Health
              </div>
              <div className="flex items-center gap-2">
                <div className="size-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm text-foreground">
                  All systems operational
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {activity && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">This Week</h3>
              <p className="text-xs text-muted-foreground">
                Last {activity.periodDays} days activity
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <ActivityStat
              label="New Users"
              value={activity.newUsers}
              accent="info"
            />
            <ActivityStat
              label="Enrollments"
              value={activity.newEnrollments}
              accent="primary"
            />
            <ActivityStat
              label="New Subjects"
              value={activity.newSubjects}
              accent="accent"
            />
            <ActivityStat
              label="Submissions"
              value={activity.newSubmissions}
              accent="muted"
            />
          </div>
        </Card>
      )}
    </div>
  )
}

type Accent = 'primary' | 'accent' | 'info' | 'muted'

const iconAccentClasses: Record<Accent, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  info: 'bg-info/10 text-info',
  muted: 'bg-muted text-muted-foreground',
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  loading,
  accent,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
  value: number
  subtitle?: string
  loading: boolean
  accent: Accent
}) {
  return (
    <Card className="p-6">
      <div
        className={`mb-4 inline-flex rounded-xl p-3 ${iconAccentClasses[accent]}`}
      >
        <Icon size={22} strokeWidth={2} />
      </div>
      <p className="mb-1 text-sm font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <p className="mb-1 text-3xl font-bold text-foreground">{value}</p>
      )}
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  )
}

const activityAccentClasses: Record<Accent, string> = {
  primary: 'bg-primary/5 border-primary/15 text-primary',
  accent: 'bg-accent/5 border-accent/15 text-accent',
  info: 'bg-info/5 border-info/15 text-info',
  muted: 'bg-muted border-border text-muted-foreground',
}

function ActivityStat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: Accent
}) {
  return (
    <div className={`rounded-lg border p-4 ${activityAccentClasses[accent]}`}>
      <div className="text-2xl font-bold">+{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}