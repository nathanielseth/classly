import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, Paperclip, Download } from 'lucide-react'
import { getSubject } from '@/lib/server/functions/subjects'
import { getMaterial } from '@/lib/server/functions/materials'
import { getOwnSubmission } from '@/lib/server/functions/submissions'
import { SubmissionPanel } from '@/components/classroom/SubmissionPanel'
import { SubmissionsListPanel } from '@/components/classroom/SubmissionsListPanel'
import { QuizBuilderPanel } from '@/components/classroom/QuizBuilderPanel'
import { QuizTakingPanel } from '@/components/classroom/QuizTakingPanel'
import { CommentsPanel } from '@/components/classroom/CommentsPanel'

export const Route = createFileRoute(
  '/_authenticated/classroom/$subjectId/materials/$materialId',
)({
  loader: async ({ params, context }) => {
    const { queryClient } = context
    const userState = context.userState

    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['subjects', 'detail', params.subjectId],
        queryFn: () => getSubject({ data: { subjectId: params.subjectId } }),
      }),
      queryClient.ensureQueryData({
        queryKey: ['materials', 'detail', params.materialId],
        queryFn: () =>
          getMaterial({ data: { materialId: params.materialId } }),
      }),
      userState.status === 'approved' && userState.profile.role === 'student'
        ? queryClient.ensureQueryData({
            queryKey: ['submissions', 'own', params.materialId],
            queryFn: () =>
              getOwnSubmission({ data: { materialId: params.materialId } }),
          })
        : Promise.resolve(),
    ])
  },
  component: MaterialDetailPage,
  errorComponent: MaterialDetailError,
})

function MaterialDetailError({ error }: { error: Error }) {
  return (
    <div className="max-w-2xl mx-auto mt-12 bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <h1 className="font-semibold text-red-900 mb-1">Can't open this material</h1>
      <p className="text-sm text-red-700">{error.message}</p>
    </div>
  )
}

function MaterialDetailPage() {
  const { subjectId, materialId } = Route.useParams()
  const { userState } = Route.useRouteContext()

  const subjectQuery = useQuery({
    queryKey: ['subjects', 'detail', subjectId],
    queryFn: () => getSubject({ data: { subjectId } }),
  })
  const materialQuery = useQuery({
    queryKey: ['materials', 'detail', materialId],
    queryFn: () => getMaterial({ data: { materialId } }),
  })

  if (userState.status !== 'approved') return null
  if (!subjectQuery.data || !materialQuery.data) return null

  const subject = subjectQuery.data
  const material = materialQuery.data
  const role = userState.profile.role
  const isInstructor = role === 'instructor' || role === 'admin'

  const dueDate = material.due_date ? new Date(material.due_date) : null
  const isOverdue = dueDate ? dueDate < new Date() : false

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <Link
          to="/classroom/$subjectId"
          params={{ subjectId }}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to {subject.name}
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">
              {material.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
              <span className="font-medium">{subject.name}</span>
              {dueDate && (
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                    Due{' '}
                    {dueDate.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              {material.max_points > 0 && (
                <span>{material.max_points} points</span>
              )}
              <span className="capitalize text-gray-500">
                &bull; {material.type}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Instructions
        </h2>
        <div className="text-gray-700 whitespace-pre-wrap">
          {material.instructions ||
            material.description ||
            'No instructions provided.'}
        </div>

        {material.file_url && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Attached Files
            </h3>
            <a
              href={material.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors w-fit"
            >
              <Paperclip size={16} />
              <span>{material.file_name || 'Download attachment'}</span>
              <Download size={16} />
            </a>
          </div>
        )}
      </div>

      {material.type === 'quiz' ? (
        isInstructor ? (
          <QuizBuilderPanel materialId={materialId} />
        ) : (
          <QuizTakingPanel materialId={materialId} />
        )
      ) : isInstructor ? (
        <SubmissionsListPanel
          materialId={materialId}
          materialTitle={material.title}
          maxPoints={material.max_points}
        />
      ) : (
        <SubmissionPanel
          materialId={materialId}
          maxPoints={material.max_points}
          dueDate={material.due_date}
          allowLateSubmission={material.allow_late_submission}
        />
      )}

      <CommentsPanel
        materialId={materialId}
        subjectId={subjectId}
        currentUserId={userState.profile.id}
        isInstructor={isInstructor}
      />
    </div>
  )
}