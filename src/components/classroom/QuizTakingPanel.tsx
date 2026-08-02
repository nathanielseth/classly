import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  RotateCcw,
  Trophy,
  X,
} from 'lucide-react'
import {
  getOwnQuizAttempt,
  getQuizForTaking,
  submitQuizAttempt,
} from '@/lib/server/functions/quizzes'
import { useExamLock } from '@/hooks/useExamLock'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface QuizTakingPanelProps {
  materialId: string
}

export function QuizTakingPanel({ materialId }: QuizTakingPanelProps) {
  const queryClient = useQueryClient()
  const { lockExam, unlockExam } = useExamLock()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({})
  const [reviewing, setReviewing] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const questionsQuery = useQuery({
    queryKey: ['quizzes', 'take', materialId],
    queryFn: () => getQuizForTaking({ data: { materialId } }),
  })

  const attemptQuery = useQuery({
    queryKey: ['quizzes', 'own-attempt', materialId],
    queryFn: () => getOwnQuizAttempt({ data: { materialId } }),
  })

  const questions = questionsQuery.data?.questions ?? []
  const existingAttempt = attemptQuery.data?.attempt ?? null
  const gradedQuestions = attemptQuery.data?.questions ?? []

  const hasSubmitted = existingAttempt !== null

  const submitMutation = useMutation({
    mutationFn: () =>
      submitQuizAttempt({
        data: {
          materialId,
          answers: selectedAnswers,
        },
      }),
    onSuccess: async () => {
      setSubmitError(null)
      await queryClient.invalidateQueries({
        queryKey: ['quizzes', 'own-attempt', materialId],
      })
    },
    onError: (err: Error) => setSubmitError(err.message),
  })

  // lock the ai assistant nav while an in-progress attempt exists
  const isInProgress =
    !hasSubmitted && !reviewing && Object.keys(selectedAnswers).length > 0
  useEffect(() => {
    if (isInProgress) {
      lockExam()
    } else {
      unlockExam()
    }
    return () => unlockExam()
  }, [isInProgress, lockExam, unlockExam])

  const handleSelect = (optionIndex: number) => {
    if (hasSubmitted) return
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }))
  }

  const handleSubmit = () => {
    const unanswered = questions.length - Object.keys(selectedAnswers).length
    if (
      unanswered > 0 &&
      !window.confirm(
        `You have ${unanswered} unanswered question${unanswered !== 1 ? 's' : ''}. Submit anyway?`,
      )
    ) {
      return
    }
    submitMutation.mutate()
  }

  const handleRetake = () => {
    setSelectedAnswers({})
    setCurrentIndex(0)
    setReviewing(false)
    setSubmitError(null)
    queryClient.setQueryData(['quizzes', 'own-attempt', materialId], {
      attempt: null,
      questions: [],
    })
  }

  if (questionsQuery.isPending || attemptQuery.isPending) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (questionsQuery.isError || attemptQuery.isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-destructive mb-1">
            Failed to load this quiz
          </h3>
          <p className="text-sm text-destructive/80">
            {questionsQuery.error?.message ?? attemptQuery.error?.message}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
            <Clock size={24} className="text-warning" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Quiz not ready yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Your instructor hasn't published questions yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  // results / review screen (submitted attempt)
  if (hasSubmitted && existingAttempt) {
    const pct = Math.round(
      (existingAttempt.score / existingAttempt.total) * 100,
    )
    const passed = pct >= 60
    const answers = existingAttempt.answers as Record<string, number>

    if (!reviewing) {
      return (
        <Card
          className={
            passed
              ? 'border-success/30 bg-success/5'
              : 'border-destructive/30 bg-destructive/5'
          }
        >
          <CardContent className="p-8 text-center">
            <div
              className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
                passed ? 'bg-success/15' : 'bg-destructive/15'
              }`}
            >
              <Trophy
                size={36}
                className={passed ? 'text-success' : 'text-destructive'}
              />
            </div>
            <h2 className="mb-1 text-2xl font-bold text-foreground">
              {passed ? 'Great job!' : 'Keep practicing!'}
            </h2>
            <p
              className={`my-4 text-5xl font-bold ${
                passed ? 'text-success' : 'text-destructive'
              }`}
            >
              {pct}%
            </p>
            <p className="text-muted-foreground">
              You got <strong>{existingAttempt.score}</strong> out of{' '}
              <strong>{existingAttempt.total}</strong> questions correct
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={handleRetake}>
                <RotateCcw size={16} />
                Retake Quiz
              </Button>
              <Button onClick={() => setReviewing(true)}>Review Answers</Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Answer Review</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReviewing(false)}
          >
            Back to score
          </Button>
        </div>
        {gradedQuestions.map((q, i) => {
          const selected = answers[String(i)]
          const correct = q.correct_index
          const isCorrect = selected === correct
          const options = q.options as string[]

          return (
            <Card
              key={q.id}
              className={
                isCorrect
                  ? 'border-success/30 bg-success/5'
                  : 'border-destructive/30 bg-destructive/5'
              }
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      isCorrect ? 'bg-success' : 'bg-destructive'
                    }`}
                  >
                    {isCorrect ? (
                      <Check size={12} className="text-white" />
                    ) : (
                      <X size={12} className="text-white" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {q.question}
                  </p>
                </div>
                <div className="ml-9 space-y-1.5">
                  {options.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`rounded-lg px-3 py-1.5 text-sm ${
                        oi === correct
                          ? 'bg-success/15 font-medium text-success'
                          : oi === selected && !isCorrect
                            ? 'bg-destructive/15 text-destructive line-through'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                      {oi === correct && ' \u2713'}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // taking screen
  const currentQ = questions[currentIndex]
  const answeredCount = Object.keys(selectedAnswers).length
  const progress = (answeredCount / questions.length) * 100

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-classly-green transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`h-7 w-7 rounded-full text-xs font-medium transition-all ${
              i === currentIndex
                ? 'bg-classly-green text-white'
                : selectedAnswers[i] !== undefined
                  ? 'bg-classly-green/20 text-classly-green'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/70'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <p className="mb-6 text-lg font-semibold text-foreground">
            {currentQ.question}
          </p>
          <div className="space-y-3">
            {(currentQ.options as string[]).map((option, oi) => {
              const isSelected = selectedAnswers[currentIndex] === oi
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => handleSelect(oi)}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-classly-green bg-classly-green/5 text-classly-green'
                      : 'border-border text-foreground hover:border-classly-green/50'
                  }`}
                >
                  <span
                    className={`mr-3 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                      isSelected
                        ? 'bg-classly-green text-white'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {option}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {submitError && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={16} />
          Previous
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            onClick={() =>
              setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
            }
          >
            Next
            <ChevronRight size={16} />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Quiz'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}