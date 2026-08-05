import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { getCurrentUser } from '@/lib/server/functions/auth'
import { completeProfile } from '@/lib/server/functions/auth-actions'
import { listSubjects } from '@/lib/server/functions/subjects'
import { ExamLockProvider, useExamLock } from '@/hooks/useExamLock'
import { Sidebar } from '@/components/shared/Sidebar'
import { Navbar } from '@/components/shared/Navbar'
import { CompleteProfileScreen } from '@/components/shared/CompleteProfileScreen'
import { PendingApprovalScreen } from '@/components/shared/PendingApprovalScreen'
import { RejectedScreen } from '@/components/shared/RejectedScreen'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const state = await getCurrentUser()
    if (state.status === 'unauthenticated') {
      throw redirect({ to: '/login' })
    }
    return { userState: state }
  },
  loader: async ({ context }) => {
    const { queryClient, userState } = context

    // sidebar runs this query on every authenticated page; seeding it in the loader ensures SSR and hydration agree, avoiding spinner/subject‑list mismatches
    const showSubjectsSection =
      userState.status === 'approved' &&
      (userState.profile.role === 'student' ||
        userState.profile.role === 'instructor')

    if (showSubjectsSection) {
      await queryClient.ensureQueryData({
        queryKey: ['subjects', 'list', { includeArchived: false }],
        queryFn: () => listSubjects({ data: { includeArchived: false } }),
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { userState } = Route.useRouteContext()
  const router = useRouter()

  if (userState.status === 'no-profile') {
    return (
      <CompleteProfileScreen
        email={userState.email}
        onComplete={async (fullName, role) => {
          await completeProfile({ data: { fullName, role } })
          await router.invalidate()
        }}
      />
    )
  }

  if (userState.status === 'pending') {
    return <PendingApprovalScreen />
  }

  if (userState.status === 'rejected') {
    return <RejectedScreen />
  }

  return (
    <ExamLockProvider>
      <Shell profile={userState.profile} />
    </ExamLockProvider>
  )
}

function Shell({
  profile,
}: {
  profile: {
    full_name: string
    email: string
    role: 'student' | 'instructor' | 'admin'
  }
}) {
  const { isExamInProgress } = useExamLock()

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar profile={profile} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          aiNavDisabled={isExamInProgress}
          role={profile.role}
          fullName={profile.full_name}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}