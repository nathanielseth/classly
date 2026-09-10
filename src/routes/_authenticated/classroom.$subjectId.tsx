import { useState } from 'react'
import {
  createFileRoute,
  Outlet,
  useMatches
  
} from '@tanstack/react-router'
import type {ErrorComponentProps} from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query'
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

export const Route = createFileRoute('/_authenticated/classroom/$subjectId')({
  loader: async ({ params, context }) => {
    const { queryClient } = context
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['subjects', 'detail', params.subjectId],
        queryFn: () => getSubject({ data: { subjectId: params.subjectId } }),
      }),
      queryClient.ensureQueryData({
        queryKey: ['announcements', 'list', params.subjectId],
        queryFn: () =>
          listAnnouncements({ data: { subjectId: params.subjectId } }),
      }),
      queryClient.ensureQueryData({
        queryKey: ['materials', 'list', params.subjectId],
        queryFn: () =>
          listMaterialsWithTopics({ data: { subjectId: params.subjectId } }),
      }),
      queryClient.ensureQueryData({
        queryKey: ['enrollments', 'list', params.subjectId],
        queryFn: () =>
          listEnrollments({ data: { subjectId: params.subjectId } }),
      }),
    ])
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

  const subjectQuery = useQuery({
    queryKey: ['subjects', 'detail', subjectId],
    queryFn: () => getSubject({ data: { subjectId } }),
  })

  if (userState.status !== 'approved') return null

  if (isChildRouteActive) {
    return <Outlet />
  }

  if (!subjectQuery.data) return null

  const subject = subjectQuery.data
  const role = userState.profile.role
  const canPost = role === 'instructor' || role === 'admin'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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