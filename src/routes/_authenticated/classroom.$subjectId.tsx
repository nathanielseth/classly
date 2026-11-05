import { useState } from 'react'
import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getSubject } from '@/lib/server/functions/subjects'
import { listAnnouncements } from '@/lib/server/functions/announcements'
import { listMaterialsWithTopics } from '@/lib/server/functions/materials'
import { listEnrollments } from '@/lib/server/functions/enrollments'
import { ClassroomHeader } from '@/components/classroom/ClassroomHeader'
import { ClassroomTabs } from '@/components/classroom/ClassroomTabs'
import type { ClassroomTab } from '@/components/classroom/ClassroomTabs'
import { StreamTab } from '@/components/classroom/StreamTab'
import { MaterialsTab } from '@/components/classroom/MaterialsTab'
import { PeopleTab } from '@/components/classroom/PeopleTab'
import { PageSkeleton } from '@/components/shared/PageSkeleton'

const subjectOptions = (subjectId: string) =>
  queryOptions({
    queryKey: ['subjects', 'detail', subjectId],
    queryFn: () => getSubject({ data: { subjectId } }),
  })

const announcementsOptions = (subjectId: string) =>
  queryOptions({
    queryKey: ['announcements', 'list', subjectId],
    queryFn: () => listAnnouncements({ data: { subjectId } }),
  })

const materialsOptions = (subjectId: string) =>
  queryOptions({
    queryKey: ['materials', 'list', subjectId],
    queryFn: () => listMaterialsWithTopics({ data: { subjectId } }),
  })

const enrollmentsOptions = (subjectId: string) =>
  queryOptions({
    queryKey: ['enrollments', 'list', subjectId],
    queryFn: () => listEnrollments({ data: { subjectId } }),
  })

export const Route = createFileRoute('/_authenticated/classroom/$subjectId')({
  loader: async ({ params, context }) => {
    const { queryClient } = context
    void queryClient.prefetchQuery(announcementsOptions(params.subjectId))
    void queryClient.prefetchQuery(materialsOptions(params.subjectId))
    void queryClient.prefetchQuery(enrollmentsOptions(params.subjectId))
    await queryClient.ensureQueryData(subjectOptions(params.subjectId))
  },
  component: ClassroomPage,
  errorComponent: ClassroomError,
})

function ClassroomError({ error }: ErrorComponentProps) {
  return (
    <div className="max-w-2xl mx-auto mt-12 bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center">
      <h1 className="font-semibold text-destructive mb-1">
        Can't open this classroom
      </h1>
      <p className="text-sm text-destructive/80">
        {error instanceof Error ? error.message : 'Something went wrong.'}
      </p>
    </div>
  )
}

function ClassroomPage() {
  const { subjectId } = Route.useParams()
  const { userState } = Route.useRouteContext()
  const [tab, setTab] = useState<ClassroomTab>('stream')

  const matches = useMatches()
  const isChildRouteActive = matches.some(
    (match) =>
      match.routeId ===
      '/_authenticated/classroom/$subjectId/materials/$materialId',
  )

  const subjectQuery = useQuery(subjectOptions(subjectId))

  if (userState.status !== 'approved') return null

  if (isChildRouteActive) {
    return <Outlet />
  }

  if (!subjectQuery.data) return <PageSkeleton />

  const subject = subjectQuery.data
  const role = userState.profile.role
  const canPost = role === 'instructor' || role === 'admin'

  return (
    <div className="page max-w-5xl space-y-6">
      <ClassroomHeader subject={subject} />
      <ClassroomTabs active={tab} onChange={setTab} />

      {tab === 'stream' && (
        <StreamTab
          subjectId={subjectId}
          currentUserId={userState.profile.id}
          canPost={canPost}
          isAdmin={role === 'admin'}
        />
      )}

      {tab === 'materials' && (
        <MaterialsTab subjectId={subjectId} canManage={canPost} />
      )}

      {tab === 'people' && (
        <PeopleTab
          subjectId={subjectId}
          subject={subject}
          currentUserId={userState.profile.id}
          canManage={canPost}
        />
      )}
    </div>
  )
}