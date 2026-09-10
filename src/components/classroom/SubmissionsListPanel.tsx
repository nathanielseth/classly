import { formatShortDateTime } from '@/lib/date-utils'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Paperclip,
  Loader2,
} from 'lucide-react'
import {
  gradeSubmission,
  listSubmissionsForMaterial,
} from '@/lib/server/functions/submissions'
import { SubmissionGradingModal } from './SubmissionGradingModal'
import { ExportGrades } from './ExportGrades'
import { toast } from '@/components/ui/toast'

interface SubmissionsListPanelProps {
  materialId: string
  materialTitle: string
  maxPoints: number
}

type Roster = Awaited<ReturnType<typeof listSubmissionsForMaterial>>['roster']
type RosterEntry = Roster[number]

type Filter = 'all' | 'assigned' | 'turned_in' | 'graded'

function getStatusBadge(
  submission: RosterEntry['submission'],
  maxPoints: number,
) {
  if (!submission || submission.status === 'not_submitted') {
    return {
      text: 'Assigned',
      icon: Clock,
      classes: 'bg-gray-100 text-gray-600',
    }
  }

  switch (submission.status) {
    case 'submitted':
      return {
        text: 'Turned in',
        icon: CheckCircle,
        classes: 'bg-blue-100 text-blue-700',
      }
    case 'late':
      return {
        text: 'Turned in late',
        icon: AlertCircle,
        classes: 'bg-orange-100 text-orange-700',
      }
    case 'graded':
    case 'returned':
      return {
        text: `Graded (${submission.grade}/${maxPoints})`,
        icon: CheckCircle,
        classes: 'bg-green-100 text-green-700',
      }
    default:
      return {
        text: 'Unknown',
        icon: AlertCircle,
        classes: 'bg-gray-100 text-gray-600',
      }
  }
}

export function SubmissionsListPanel({
  materialId,
  materialTitle,
  maxPoints,
}: SubmissionsListPanelProps) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [grading, setGrading] = useState<RosterEntry | null>(null)

  const rosterQuery = useQuery({
    queryKey: ['submissions', 'roster', materialId],
    queryFn: () => listSubmissionsForMaterial({ data: { materialId } }),
  })

  const gradeMutation = useMutation({
    mutationFn: (values: {
      submissionId: string
      grade: number
      feedback: string
    }) =>
      gradeSubmission({
        data: {
          submissionId: values.submissionId,
          grade: values.grade,
          feedback: values.feedback,
        },
      }),
    onSuccess: async () => {
      setGrading(null)
      await queryClient.invalidateQueries({
        queryKey: ['submissions', 'roster', materialId],
      })
      toast({ variant: 'success', title: 'Grade saved' })
    },
  })

  if (rosterQuery.isPending) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (rosterQuery.isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900 mb-1">
          Failed to load submissions
        </h3>
        <p className="text-sm text-red-700">{rosterQuery.error.message}</p>
      </div>
    )
  }

  const roster = rosterQuery.data.roster

  const stats = {
    total: roster.length,
    turnedIn: roster.filter(
      (r) =>
        r.submission?.status === 'submitted' ||
        r.submission?.status === 'late' ||
        r.submission?.status === 'graded' ||
        r.submission?.status === 'returned',
    ).length,
    graded: roster.filter(
      (r) =>
        r.submission?.status === 'graded' ||
        r.submission?.status === 'returned',
    ).length,
  }
  const assigned = stats.total - stats.turnedIn

  const filtered = roster.filter((entry) => {
    const status = entry.submission?.status ?? 'not_submitted'
    switch (filter) {
      case 'assigned':
        return status === 'not_submitted'
      case 'turned_in':
        return status === 'submitted' || status === 'late'
      case 'graded':
        return status === 'graded' || status === 'returned'
      default:
        return true
    }
  })

  const sorted = [...filtered].sort((a, b) => {
    const aSubmitted = a.submission?.status !== 'not_submitted' && a.submission
    const bSubmitted = b.submission?.status !== 'not_submitted' && b.submission
    if (!aSubmitted && bSubmitted) return 1
    if (aSubmitted && !bSubmitted) return -1
    if (a.submission?.submitted_at && b.submission?.submitted_at) {
      return (
        new Date(b.submission.submitted_at).getTime() -
        new Date(a.submission.submitted_at).getTime()
      )
    }
    return 0
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Student Work
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {stats.turnedIn} / {stats.total} turned in
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {assigned}
                </div>
                <div className="text-xs text-gray-600">Assigned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.turnedIn}
                </div>
                <div className="text-xs text-gray-600">Turned in</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.graded}
                </div>
                <div className="text-xs text-gray-600">Graded</div>
              </div>
            </div>
            <ExportGrades
              roster={roster}
              materialTitle={materialTitle}
              maxPoints={maxPoints}
            />
          </div>
        </div>

        <div className="flex gap-6 mt-4 -mb-6 pt-2 border-t border-gray-100">
          {(
            [
              { key: 'all', label: 'All', count: stats.total },
              { key: 'assigned', label: 'Assigned', count: assigned },
              { key: 'turned_in', label: 'Turned in', count: stats.turnedIn },
              { key: 'graded', label: 'Graded', count: stats.graded },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`py-3 px-1 border-b-2 transition-colors text-sm ${
                filter === tab.key
                  ? 'border-classly-green text-classly-green font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No submissions in this category</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sorted.map((entry) => {
            const badge = getStatusBadge(entry.submission, maxPoints)
            const StatusIcon = badge.icon
            const isSubmitted =
              entry.submission !== null &&
              entry.submission.status !== 'not_submitted'

            return (
              <div
                key={entry.student.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-classly-green rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                    {entry.student.full_name[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {entry.student.full_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {entry.student.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${badge.classes}`}
                      >
                        <StatusIcon size={12} />
                        {badge.text}
                      </div>
                      {entry.submission?.submitted_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatShortDateTime(entry.submission.submitted_at)}
                        </p>
                      )}
                    </div>

                    {entry.submission?.file_url && (
                      <div className="text-gray-400">
                        <Paperclip size={16} />
                      </div>
                    )}

                    {isSubmitted && entry.submission ? (
                      <button
                        onClick={() => setGrading(entry)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          entry.submission.status === 'graded' ||
                          entry.submission.status === 'returned'
                            ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            : 'bg-classly-green text-white hover:bg-classly-green/90 shadow-sm'
                        }`}
                      >
                        {entry.submission.status === 'graded' ||
                        entry.submission.status === 'returned'
                          ? 'Review'
                          : 'Grade'}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 border border-gray-300 text-gray-500 rounded-lg text-sm cursor-not-allowed opacity-60"
                      >
                        Not submitted
                      </button>
                    )}
                  </div>
                </div>

                {isSubmitted && entry.submission?.content && (
                  <div className="mt-3 pl-14">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {entry.submission.content}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {grading?.submission && (
        <SubmissionGradingModal
          submission={grading.submission}
          materialTitle={materialTitle}
          maxPoints={maxPoints}
          student={grading.student}
          onClose={() => setGrading(null)}
          onSave={(values) =>
            gradeMutation.mutateAsync({
              submissionId: grading.submission!.id,
              ...values,
            })
          }
        />
      )}
    </div>
  )
}