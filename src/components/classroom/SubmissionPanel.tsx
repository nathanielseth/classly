import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toast'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Upload,
  X,
  FileText,
  Paperclip,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import {
  getOwnSubmission,
  getSubmissionFileUrl,
  removeSubmissionFile,
  submitWork,
  unsubmitWork,
  uploadSubmissionFile,
} from '@/lib/server/functions/submissions'

interface SubmissionPanelProps {
  materialId: string
  maxPoints: number
  dueDate: string | null
  allowLateSubmission: boolean
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

function SubmissionFileLink({
  submissionId,
  fileName,
}: {
  submissionId: string
  fileName: string | null
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const { url } = await getSubmissionFileUrl({ data: { submissionId } })
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast({
        variant: 'destructive',
        title: "Couldn't open file",
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors w-fit disabled:opacity-60"
    >
      <Paperclip size={16} />
      <span>{fileName || 'Download file'}</span>
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Download size={16} />
      )}
    </button>
  )
}

export function SubmissionPanel({
  materialId,
  maxPoints,
  dueDate,
  allowLateSubmission,
}: SubmissionPanelProps) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [contentDirty, setContentDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmUnsubmitOpen, setConfirmUnsubmitOpen] = useState(false)

  const submissionQuery = useQuery({
    queryKey: ['submissions', 'own', materialId],
    queryFn: () => getOwnSubmission({ data: { materialId } }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['submissions', 'own', materialId],
    })

  const submitMutation = useMutation({
    mutationFn: (text: string) =>
      submitWork({ data: { materialId, content: text } }),
    onSuccess: async () => {
      setError(null)
      setContentDirty(false)
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const unsubmitMutation = useMutation({
    mutationFn: (submissionId: string) =>
      unsubmitWork({ data: { submissionId } }),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const uploadFileMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.set('materialId', materialId)
      formData.set('file', file)
      return uploadSubmissionFile({ data: formData })
    },
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const removeFileMutation = useMutation({
    mutationFn: (submissionId: string) =>
      removeSubmissionFile({ data: { submissionId } }),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const submission = submissionQuery.data ?? null
  const displayContent = contentDirty ? content : (submission?.content ?? '')

  const due = dueDate ? new Date(dueDate) : null
  const isOverdue = due ? due < new Date() : false
  const canSubmit = !isOverdue || allowLateSubmission

  const isSubmitted =
    submission?.status === 'submitted' ||
    submission?.status === 'late' ||
    submission?.status === 'graded' ||
    submission?.status === 'returned'
  const isGraded =
    submission?.status === 'graded' || submission?.status === 'returned'

  const busy =
    submitMutation.isPending ||
    unsubmitMutation.isPending ||
    uploadFileMutation.isPending ||
    removeFileMutation.isPending

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'warning',
        title: 'File too large',
        description: 'File size must be less than 10MB.',
      })
      return
    }
    uploadFileMutation.mutate(file)
  }

  const handleTurnIn = () => {
    if (!displayContent.trim() && !submission?.file_url) {
      setError('Add some content or attach a file before turning in.')
      return
    }
    submitMutation.mutate(displayContent.trim())
  }

  const handleUnsubmit = () => {
    if (!submission) return
    setConfirmUnsubmitOpen(true)
  }

  const confirmUnsubmit = () => {
    if (!submission) return
    unsubmitMutation.mutate(submission.id)
    setConfirmUnsubmitOpen(false)
  }

  if (submissionQuery.isPending) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (submissionQuery.isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900 mb-1">
          Failed to load your submission
        </h3>
        <p className="text-sm text-red-700">
          {submissionQuery.error.message}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Your Work</h2>
        {isSubmitted && !isGraded && canSubmit && (
          <button
            onClick={handleUnsubmit}
            disabled={busy}
            className="text-sm text-gray-600 hover:text-gray-900 underline disabled:opacity-50"
          >
            Unsubmit
          </button>
        )}
      </div>

      <div className="p-6 space-y-4">
        {isSubmitted && (
          <div
            className={`flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg ${
              isGraded
                ? 'bg-green-50 text-green-700'
                : submission.is_late
                  ? 'bg-orange-50 text-orange-700'
                  : 'bg-blue-50 text-blue-700'
            }`}
          >
            {submission.is_late && !isGraded ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle size={16} />
            )}
            <span>
              {isGraded
                ? 'Graded and returned'
                : submission.is_late
                  ? 'Turned in late'
                  : 'Turned in'}
            </span>
            {submission.submitted_at && (
              <span className="text-xs ml-auto">
                {new Date(submission.submitted_at).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {isGraded && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-900">
                Grade
              </span>
              <span className="text-2xl font-bold text-green-700">
                {submission.grade} / {maxPoints}
              </span>
            </div>
            {submission.feedback && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-sm font-medium text-green-900 mb-1">
                  Feedback
                </p>
                <p className="text-sm text-green-800 whitespace-pre-wrap">
                  {submission.feedback}
                </p>
              </div>
            )}
          </div>
        )}

        {!isGraded && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your answer
              </label>
              <textarea
                value={displayContent}
                onChange={(e) => {
                  setContentDirty(true)
                  setContent(e.target.value)
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 resize-none"
                rows={6}
                placeholder="Type your answer here..."
                disabled={busy}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach file (optional)
              </label>

              {!submission?.file_url ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-classly-green transition-colors">
                  <input
                    type="file"
                    id="submission-file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={busy}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="submission-file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {uploadFileMutation.isPending ? (
                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Click to upload
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, DOC, PPT, Images (Max 10MB)
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {submission.file_name}
                      </p>
                      {submission.file_size !== null && (
                        <p className="text-xs text-gray-500">
                          {formatFileSize(submission.file_size)}
                        </p>
                      )}
                    </div>
                    {!busy && (
                      <button
                        onClick={() => removeFileMutation.mutate(submission.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleTurnIn}
                disabled={busy || !canSubmit}
                className="px-6 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Turn in'
                )}
              </button>
            </div>
          </>
        )}

        {isGraded && submission.content && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">
              Your submitted answer
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {submission.content}
            </p>
          </div>
        )}

        {isGraded && submission.file_url && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">
              Your submitted file
            </p>
            <SubmissionFileLink
              submissionId={submission.id}
              fileName={submission.file_name}
            />
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmUnsubmitOpen}
        onOpenChange={setConfirmUnsubmitOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsubmit this work?</AlertDialogTitle>
            <AlertDialogDescription>
              You can edit and resubmit before the deadline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnsubmit}>
              Unsubmit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}