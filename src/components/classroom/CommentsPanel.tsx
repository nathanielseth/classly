import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Trash2,
  ChevronDown,
} from 'lucide-react'
import {
  createClassComment,
  createPrivateComment,
  deleteComment,
  listClassComments,
  listPrivateComments,
  listPrivateThreadStudentIds,
} from '@/lib/server/functions/comments'
import { listEnrollments } from '@/lib/server/functions/enrollments'

interface CommentAuthor {
  id: string
  full_name: string
  role: string
}

interface Comment {
  id: string
  content: string
  author_id: string
  created_at: string | null
  author: CommentAuthor
}

interface CommentsPanelProps {
  materialId: string
  currentUserId: string
  isInstructor: boolean
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function CommentThread({
  comments,
  loading,
  errorMessage,
  currentUserId,
  isInstructor,
  emptyTitle,
  emptySubtitle,
  placeholder,
  onSubmit,
  submitting,
  onDelete,
  deletingId,
}: {
  comments: Comment[]
  loading: boolean
  errorMessage: string | null
  currentUserId: string
  isInstructor: boolean
  emptyTitle: string
  emptySubtitle: string
  placeholder: string
  onSubmit: (content: string) => void
  submitting: boolean
  onDelete: (commentId: string) => void
  deletingId: string | null
}) {
  const [draft, setDraft] = useState('')

  const handleSubmit = () => {
    if (!draft.trim()) return
    onSubmit(draft.trim())
    setDraft('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit()
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
          {'U'}
        </div>
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 resize-none text-sm"
            rows={3}
            disabled={submitting}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">Ctrl+Enter to post</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || !draft.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Post
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive bg-destructive/8 px-3 py-2 rounded-lg">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-muted-foreground/70 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{emptyTitle}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{emptySubtitle}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isOwnComment = comment.author_id === currentUserId
            const authorIsInstructor = comment.author.role === 'instructor'
            const canDelete = isOwnComment || isInstructor

            return (
              <div key={comment.id} className="flex gap-3 group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                    authorIsInstructor ? 'bg-chart-4 text-background' : 'bg-info text-info-foreground'
                  }`}
                >
                  {comment.author.full_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground">
                        {comment.author.full_name}
                      </span>
                      {authorIsInstructor && (
                        <span className="text-xs font-medium text-chart-4 bg-chart-4/10 px-1.5 py-0.5 rounded">
                          Instructor
                        </span>
                      )}
                      {isOwnComment && (
                        <span className="text-xs text-muted-foreground">(You)</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(comment.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => onDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        className="text-xs text-muted-foreground/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 disabled:opacity-50"
                      >
                        {deletingId === comment.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Trash2 size={11} />
                        )}
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ClassCommentsTab({
  materialId,
  currentUserId,
  isInstructor,
}: {
  materialId: string
  currentUserId: string
  isInstructor: boolean
}) {
  const queryClient = useQueryClient()
  const queryKey = ['comments', 'class', materialId]

  const COMMENTS_POLL_MS = 4000

  const commentsQuery = useQuery({
    queryKey,
    queryFn: () => listClassComments({ data: { materialId } }),
    refetchInterval: COMMENTS_POLL_MS,
  })

  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (content: string) =>
      createClassComment({ data: { materialId, content } }),
    onSuccess: async () => {
      setError(null)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment({ data: { commentId } }),
    onMutate: (commentId: string) => setDeletingId(commentId),
    onSuccess: async () => {
      setError(null)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: Error) => setError(err.message),
    onSettled: () => setDeletingId(null),
  })

  return (
    <CommentThread
      comments={commentsQuery.data?.comments ?? []}
      loading={commentsQuery.isPending}
      errorMessage={
        error ?? (commentsQuery.isError ? commentsQuery.error.message : null)
      }
      currentUserId={currentUserId}
      isInstructor={isInstructor}
      emptyTitle="No class comments yet"
      emptySubtitle="Be the first to comment"
      placeholder="Add a class comment..."
      onSubmit={(content) => createMutation.mutate(content)}
      submitting={createMutation.isPending}
      onDelete={(commentId) => deleteMutation.mutate(commentId)}
      deletingId={deletingId}
    />
  )
}

// a student sees only their own thread; an instructor sees one thread per student
function PrivateCommentsTab({
  materialId,
  subjectId,
  currentUserId,
  isInstructor,
}: {
  materialId: string
  subjectId: string
  currentUserId: string
  isInstructor: boolean
}) {
  const queryClient = useQueryClient()

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    isInstructor ? null : currentUserId,
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const rosterQuery = useQuery({
    queryKey: ['enrollments', 'list', subjectId],
    queryFn: () => listEnrollments({ data: { subjectId } }),
    enabled: isInstructor,
  })

  const activeThreadsQuery = useQuery({
    queryKey: ['comments', 'private-threads', materialId],
    queryFn: () => listPrivateThreadStudentIds({ data: { materialId } }),
    enabled: isInstructor,
  })

  const queryKey = ['comments', 'private', materialId, selectedStudentId]

  const commentsQuery = useQuery({
    queryKey,
    queryFn: () =>
      listPrivateComments({
        data: {
          materialId,
          studentId: selectedStudentId ?? undefined,
        },
      }),
    enabled: Boolean(selectedStudentId),
    refetchInterval: selectedStudentId ? 4000 : false,
  })

  const createMutation = useMutation({
    mutationFn: (content: string) =>
      createPrivateComment({
        data: {
          materialId,
          content,
          studentId: selectedStudentId ?? undefined,
        },
      }),
    onSuccess: async () => {
      setError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({
          queryKey: ['comments', 'private-threads', materialId],
        }),
      ])
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment({ data: { commentId } }),
    onMutate: (commentId: string) => setDeletingId(commentId),
    onSuccess: async () => {
      setError(null)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: Error) => setError(err.message),
    onSettled: () => setDeletingId(null),
  })

  const enrollments = rosterQuery.data?.enrollments ?? []
  const activeThreadIds = useMemo(
    () => new Set(activeThreadsQuery.data?.studentIds ?? []),
    [activeThreadsQuery.data],
  )
  const selectedStudent = enrollments.find(
    (e) => e.student?.id === selectedStudentId,
  )?.student

  if (isInstructor) {
    return (
      <div>
        <div className="px-4 pt-4">
          <div className="relative">
            <button
              onClick={() => setPickerOpen((open) => !open)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg text-sm text-left hover:border-input transition-colors"
            >
              <span
                className={selectedStudent ? 'text-foreground' : 'text-muted-foreground'}
              >
                {selectedStudent
                  ? selectedStudent.full_name
                  : 'Select a student to view their private thread'}
              </span>
              <ChevronDown size={16} className="text-muted-foreground/70 shrink-0" />
            </button>

            {pickerOpen && (
              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {rosterQuery.isPending ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={16} className="animate-spin text-muted-foreground/70" />
                  </div>
                ) : enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-3">
                    No students enrolled yet.
                  </p>
                ) : (
                  enrollments.map((e) => {
                    if (!e.student) return null
                    const hasThread = activeThreadIds.has(e.student.id)
                    return (
                      <button
                        key={e.id}
                        onClick={() => {
                          setSelectedStudentId(e.student!.id)
                          setPickerOpen(false)
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-secondary transition-colors ${
                          e.student.id === selectedStudentId ? 'bg-secondary' : ''
                        }`}
                      >
                        <span className="text-foreground">
                          {e.student.full_name}
                        </span>
                        {hasThread && (
                          <span className="text-xs text-classly-green bg-classly-green/10 px-1.5 py-0.5 rounded shrink-0">
                            Has messages
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {selectedStudentId ? (
          <CommentThread
            comments={commentsQuery.data?.comments ?? []}
            loading={commentsQuery.isPending}
            errorMessage={
              error ??
              (commentsQuery.isError ? commentsQuery.error.message : null)
            }
            currentUserId={currentUserId}
            isInstructor={isInstructor}
            emptyTitle="No private comments yet"
            emptySubtitle="Start the conversation with this student"
            placeholder={`Message ${selectedStudent?.full_name ?? 'this student'} privately...`}
            onSubmit={(content) => createMutation.mutate(content)}
            submitting={createMutation.isPending}
            onDelete={(commentId) => deleteMutation.mutate(commentId)}
            deletingId={deletingId}
          />
        ) : (
          <div className="text-center py-10 px-4">
            <Lock className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Choose a student above to see or send private comments.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <CommentThread
      comments={commentsQuery.data?.comments ?? []}
      loading={commentsQuery.isPending}
      errorMessage={
        error ?? (commentsQuery.isError ? commentsQuery.error.message : null)
      }
      currentUserId={currentUserId}
      isInstructor={isInstructor}
      emptyTitle="No private comments yet"
      emptySubtitle="Only you and your instructor can see this thread"
      placeholder="Add a private comment..."
      onSubmit={(content) => createMutation.mutate(content)}
      submitting={createMutation.isPending}
      onDelete={(commentId) => deleteMutation.mutate(commentId)}
      deletingId={deletingId}
    />
  )
}

// this panel is material-agnostic and renders for every type including quizzes
export function CommentsPanel({
  materialId,
  subjectId,
  currentUserId,
  isInstructor,
}: CommentsPanelProps & { subjectId: string }) {
  const [tab, setTab] = useState<'class' | 'private'>('class')

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="flex border-b border-border/60">
        <button
          onClick={() => setTab('class')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'class'
              ? 'border-classly-green text-classly-green'
              : 'border-transparent text-muted-foreground hover:text-foreground/80'
          }`}
        >
          <MessageSquare size={15} />
          Class Comments
        </button>
        <button
          onClick={() => setTab('private')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'private'
              ? 'border-classly-green text-classly-green'
              : 'border-transparent text-muted-foreground hover:text-foreground/80'
          }`}
        >
          <Lock size={15} />
          Private
        </button>
      </div>

      {tab === 'class' ? (
        <ClassCommentsTab
          materialId={materialId}
          currentUserId={currentUserId}
          isInstructor={isInstructor}
        />
      ) : (
        <PrivateCommentsTab
          materialId={materialId}
          subjectId={subjectId}
          currentUserId={currentUserId}
          isInstructor={isInstructor}
        />
      )}
    </div>
  )
}