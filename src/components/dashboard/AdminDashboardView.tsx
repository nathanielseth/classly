import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Users } from 'lucide-react'
import {
  getRecentUsers,
  getSystemStats,
  getWeeklyActivity,
} from '@/lib/server/functions/admin-dashboard'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getInitials } from '@/components/ui/avatar'

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
    <div className="page space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Overview</h1>

      {/* Plain numbers instead of icon tiles: an admin scans these often enough
          that the icon adds a beat of decoding, not recognition. */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
        <StatCell
          label="Users"
          value={stats?.totalUsers}
          loading={statsQuery.isLoading}
        />
        <StatCell
          label="Students"
          value={stats?.totalStudents}
          subtitle={
            stats && stats.totalUsers > 0
              ? `${Math.round((stats.totalStudents / stats.totalUsers) * 100)}% of users`
              : undefined
          }
          loading={statsQuery.isLoading}
        />
        <StatCell
          label="Instructors"
          value={stats?.totalInstructors}
          loading={statsQuery.isLoading}
        />
        <StatCell
          label="Subjects"
          value={stats?.totalSubjects}
          loading={statsQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Recent users
            </h2>
            <Link
              to="/admin/users"
              search={usersSearch}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {recentUsersQuery.isLoading ? (
            <div className="space-y-3 py-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentUsers.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No users yet.
            </p>
          ) : (
            <ul className="-mx-2">
              {recentUsers.map((user) => (
                <li key={user.id}>
                  <Link
                    to="/admin/users"
                    search={usersSearch}
                    className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground select-none">
                      {getInitials(user.full_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {user.full_name}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground capitalize">
                      {user.role}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Quick actions
          </h2>
          <Link
            to="/admin/users"
            search={usersSearch}
            className="group flex items-center gap-3 rounded-md p-2 -mx-2 transition-colors hover:bg-muted"
          >
            <Users className="size-4 text-muted-foreground" aria-hidden />
            <span className="flex-1">
              <span className="block text-sm font-medium text-foreground">
                Manage users
              </span>
              <span className="block text-sm text-muted-foreground">
                View, approve, edit accounts
              </span>
            </span>
            <ArrowRight
              className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground"
              aria-hidden
            />
          </Link>
        </Card>
      </div>

      {activity && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            This week
          </h2>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <ActivityStat label="New users" value={activity.newUsers} />
            <ActivityStat
              label="Enrollments"
              value={activity.newEnrollments}
            />
            <ActivityStat
              label="New subjects"
              value={activity.newSubjects}
            />
            <ActivityStat
              label="Submissions"
              value={activity.newSubmissions}
            />
          </dl>
        </Card>
      )}
    </div>
  )
}

function StatCell({
  label,
  value,
  subtitle,
  loading,
}: {
  label: string
  value: number | undefined
  subtitle?: string
  loading: boolean
}) {
  return (
    <div className="bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-8 w-14" />
      ) : (
        <p className="mt-0.5 text-2xl font-semibold text-foreground tabular-nums">
          {value ?? 0}
        </p>
      )}
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}

function ActivityStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dd className="text-xl font-semibold text-foreground tabular-nums">
        +{value}
      </dd>
      <dt className="mt-0.5 text-sm text-muted-foreground">{label}</dt>
    </div>
  )
}
