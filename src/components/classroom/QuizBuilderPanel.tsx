import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import {
  getQuizQuestions,
  listQuizAttemptsForMaterial,
  saveQuizQuestions,
} from '@/lib/server/functions/quizzes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface QuizBuilderPanelProps {
  materialId: string
}

interface DraftQuestion {
  key: string
  question: string
  options: string[]
  correctIndex: number
}

function makeKey() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function emptyQuestion(): DraftQuestion {
  return {
    key: makeKey(),
    question: '',
    options: ['', ''],
    correctIndex: 0,
  }
}

export function QuizBuilderPanel({ materialId }: QuizBuilderPanelProps) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<DraftQuestion[] | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const questionsQuery = useQuery({
    queryKey: ['quizzes', 'questions', materialId],
    queryFn: () => getQuizQuestions({ data: { materialId } }),
  })

  const attemptsQuery = useQuery({
    queryKey: ['quizzes', 'attempts', materialId],
    queryFn: () => listQuizAttemptsForMaterial({ data: { materialId } }),
  })

  // seed the editable draft from the server once, then let local edits own the array
  useEffect(() => {
    if (draft !== null || !questionsQuery.data) return
    const loaded = questionsQuery.data.questions.map((q) => ({
      key: makeKey(),
      question: q.question,
      options: q.options as string[],
      correctIndex: q.correct_index,
    }))
    setDraft(loaded)
  }, [draft, questionsQuery.data])

  const saveMutation = useMutation({
    mutationFn: (questions: DraftQuestion[]) =>
      saveQuizQuestions({
        data: {
          materialId,
          questions: questions.map((q) => ({
            question: q.question.trim(),
            options: q.options.map((o) => o.trim()),
            correctIndex: q.correctIndex,
          })),
        },
      }),
    onSuccess: async (result) => {
      setSaveError(null)
      setSavedAt(Date.now())
      queryClient.setQueryData(['quizzes', 'questions', materialId], result)
    },
    onError: (err: Error) => setSaveError(err.message),
  })

  const updateQuestion = (key: string, patch: Partial<DraftQuestion>) => {
    setDraft((prev) =>
      prev ? prev.map((q) => (q.key === key ? { ...q, ...patch } : q)) : prev,
    )
  }

  const updateOption = (key: string, optionIndex: number, value: string) => {
    setDraft((prev) =>
      prev
        ? prev.map((q) =>
            q.key === key
              ? {
                  ...q,
                  options: q.options.map((o, i) =>
                    i === optionIndex ? value : o,
                  ),
                }
              : q,
          )
        : prev,
    )
  }

  const addOption = (key: string) => {
    setDraft((prev) =>
      prev
        ? prev.map((q) =>
            q.key === key && q.options.length < 8
              ? { ...q, options: [...q.options, ''] }
              : q,
          )
        : prev,
    )
  }

  const removeOption = (key: string, optionIndex: number) => {
    setDraft((prev) =>
      prev
        ? prev.map((q) => {
            if (q.key !== key || q.options.length <= 2) return q
            const options = q.options.filter((_, i) => i !== optionIndex)
            const correctIndex =
              q.correctIndex === optionIndex
                ? 0
                : q.correctIndex > optionIndex
                  ? q.correctIndex - 1
                  : q.correctIndex
            return { ...q, options, correctIndex }
          })
        : prev,
    )
  }

  const addQuestion = () => {
    setDraft((prev) => [...(prev ?? []), emptyQuestion()])
  }

  const removeQuestion = (key: string) => {
    setDraft((prev) => (prev ? prev.filter((q) => q.key !== key) : prev))
  }

  const validate = (questions: DraftQuestion[]): string | null => {
    if (questions.length === 0) {
      return 'Add at least one question before saving.'
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question.trim()) {
        return `Question ${i + 1} needs question text.`
      }
      if (q.options.some((o) => !o.trim())) {
        return `Question ${i + 1} has an empty option - fill it in or remove it.`
      }
      if (q.correctIndex >= q.options.length) {
        return `Question ${i + 1} needs a correct answer selected.`
      }
    }
    return null
  }

  const handleSave = () => {
    if (!draft) return
    const validationError = validate(draft)
    if (validationError) {
      setSaveError(validationError)
      return
    }
    saveMutation.mutate(draft)
  }

  if (questionsQuery.isPending || draft === null) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (questionsQuery.isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-destructive mb-1">
            Failed to load quiz questions
          </h3>
          <p className="text-sm text-destructive/80">
            {questionsQuery.error.message}
          </p>
        </CardContent>
      </Card>
    )
  }

  const roster = attemptsQuery.data?.roster ?? []
  const attemptedCount = roster.filter((r) => r.attempt !== null).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList size={18} className="text-classly-green" />
              Quiz Questions
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {draft.length} question{draft.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {draft.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No questions yet. Add your first question below, or generate one
              with the AI Assistant's Quiz Generator and save it here.
            </div>
          )}

          {draft.map((q, qIndex) => (
            <div
              key={q.key}
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-classly-green text-xs font-bold text-white">
                  {qIndex + 1}
                </span>
                <Textarea
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(q.key, { question: e.target.value })
                  }
                  placeholder="Question text..."
                  rows={2}
                  className="flex-1"
                  disabled={saveMutation.isPending}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(q.key)}
                  disabled={saveMutation.isPending}
                  className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                  title="Delete question"
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              <div className="ml-9 space-y-2">
                {q.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestion(q.key, { correctIndex: oIndex })
                      }
                      disabled={saveMutation.isPending}
                      title="Mark as correct answer"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        q.correctIndex === oIndex
                          ? 'border-classly-green bg-classly-green'
                          : 'border-border hover:border-classly-green'
                      }`}
                    >
                      {q.correctIndex === oIndex && (
                        <Check size={12} className="text-white" />
                      )}
                    </button>
                    <Input
                      value={option}
                      onChange={(e) =>
                        updateOption(q.key, oIndex, e.target.value)
                      }
                      placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                      disabled={saveMutation.isPending}
                      className={
                        q.correctIndex === oIndex
                          ? 'border-classly-green/40 bg-classly-green/5'
                          : ''
                      }
                    />
                    {q.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(q.key, oIndex)}
                        disabled={saveMutation.isPending}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-0.5">
                  <p className="text-xs text-muted-foreground">
                    Click the circle to mark the correct answer
                  </p>
                  {q.options.length < 8 && (
                    <button
                      type="button"
                      onClick={() => addOption(q.key)}
                      disabled={saveMutation.isPending}
                      className="text-xs font-medium text-classly-green hover:underline"
                    >
                      + Add option
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addQuestion}
            disabled={saveMutation.isPending}
            className="w-full border-dashed"
          >
            <Plus size={16} />
            Add Question
          </Button>

          {saveError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            {savedAt && !saveMutation.isPending && !saveError && (
              <span className="flex items-center gap-1.5 text-sm text-classly-green">
                <Check size={14} /> Saved
              </span>
            )}
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${draft.length} Question${draft.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={18} className="text-classly-green" />
            Student Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attemptsQuery.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2
                size={18}
                className="animate-spin text-muted-foreground"
              />
            </div>
          ) : attemptsQuery.isError ? (
            <p className="text-sm text-destructive">
              {attemptsQuery.error.message}
            </p>
          ) : roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students enrolled yet.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {attemptedCount} of {roster.length} student
                {roster.length !== 1 ? 's have' : ' has'} taken this quiz.
                Auto-graded - nothing to review manually.
              </p>
              <div className="divide-y divide-border">
                {roster.map(({ student, attempt }) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {student.full_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {student.email}
                      </p>
                    </div>
                    {attempt ? (
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(attempt.submitted_at).toLocaleDateString(
                            'en-US',
                            { month: 'short', day: 'numeric' },
                          )}
                        </span>
                        <span className="rounded-full bg-classly-green/10 px-2.5 py-1 text-xs font-semibold text-classly-green">
                          {attempt.score}/{attempt.total} (
                          {Math.round((attempt.score / attempt.total) * 100)}%)
                        </span>
                      </div>
                    ) : (
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        Not taken
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}