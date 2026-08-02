import { useState } from 'react'
import {
  X,
  Loader2,
  Paperclip,
  Download,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { getSubmissionFileUrl } from '@/lib/server/functions/submissions'

interface GradingSubmission {
  id: string
  content: string | null
  file_url: string | null
  file_name: string | null
  is_late: boolean | null
  submitted_at: string | null
  grade: number | null
  feedback: string | null
}

interface SubmissionGradingModalProps {
  submission: GradingSubmission
  materialTitle: string
  maxPoints: number
  student: { full_name: string; email: string }
  onClose: () => void
  onSave: (values: { grade: number; feedback: string }) => Promise<unknown>
}

export function SubmissionGradingModal({
  submission,
  materialTitle,
  maxPoints,
  student,
  onClose,
  onSave,
}: SubmissionGradingModalProps) {
  const [grade, setGrade] = useState(submission.grade?.toString() ?? '')
  const [feedback, setFeedback] = useState(submission.feedback ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileLoading, setFileLoading] = useState(false)

  const isLate = submission.is_late
  const submittedAt = submission.submitted_at
    ? new Date(submission.submitted_at)
    : null

  const gradeValue = grade === '' ? NaN : Number(grade)
  const gradeValid =
    !Number.isNaN(gradeValue) && gradeValue >= 0 && gradeValue <= maxPoints

  const handleSave = async () => {
    if (!gradeValid) {
      setError(`Grade must be between 0 and ${maxPoints}`)
      return
    }
    try {
      setSaving(true)
      setError(null)
      await onSave({ grade: gradeValue, feedback: feedback.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grade')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenFile = async () => {
    setFileLoading(true)
    try {
      const { url } = await getSubmissionFileUrl({
        data: { submissionId: submission.id },
      })
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to open file.')
    } finally {
      setFileLoading(false)
    }
  }

  const calculatePercentage = () => {
    if (Number.isNaN(gradeValue) || !maxPoints) return 0
    return Math.round((gradeValue / maxPoints) * 100)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Grade Submission
              </h2>
              <p className="text-sm text-gray-600 mt-1">{materialTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={saving}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-classly-green rounded-full flex items-center justify-center text-white font-semibold">
                {student.full_name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{student.full_name}</p>
                <p className="text-sm text-gray-600">{student.email}</p>
              </div>
              {submittedAt && (
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock size={14} />
                    <span>
                      {submittedAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {isLate && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                      <AlertCircle size={12} />
                      <span>Turned in late</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Student's Answer
            </h3>

            {submission.content ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {submission.content}
                </p>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No written answer provided
              </div>
            )}

            {submission.file_url && (
              <div className="mt-3">
                <h4 className="text-xs font-medium text-gray-700 mb-2">
                  Attached File
                </h4>
                <button
                  onClick={handleOpenFile}
                  disabled={fileLoading}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors w-fit disabled:opacity-60"
                >
                  <Paperclip size={16} />
                  <span>{submission.file_name || 'Download submission'}</span>
                  {fileLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Grade & Feedback
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade *
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="number"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all"
                      placeholder="0"
                      min={0}
                      max={maxPoints}
                      disabled={saving}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      / {maxPoints}
                    </span>
                  </div>
                  {grade !== '' && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-classly-green">
                        {calculatePercentage()}%
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum points: {maxPoints}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 transition-all resize-none"
                  rows={5}
                  placeholder="Provide constructive feedback for the student..."
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This feedback will be visible to the student
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || grade === ''}
            className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Return'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}