import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Brain,
  AlertCircle,
  Loader2,
  Check,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react'
import { generateQuiz } from '@/lib/server/functions/ai'
import {
  createMaterial,
  getMaterialContentForAi,
} from '@/lib/server/functions/materials'
import { saveQuizQuestions } from '@/lib/server/functions/quizzes'
import { useExamLock } from '@/hooks/useExamLock'
import { MaterialPicker } from './MaterialPicker'
import type { PickedMaterial } from './MaterialPicker'

type QuizQuestion = {
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export function QuizPanel({
  userRole,
}: {
  userRole: 'student' | 'instructor' | 'admin'
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  )
  const [selectedMaterial, setSelectedMaterial] =
    useState<PickedMaterial | null>(null)
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [savedToClassroom, setSavedToClassroom] = useState(false)

  const { lockExam, unlockExam } = useExamLock()
  const isInstructor = userRole === 'instructor'

  const generateMutation = useMutation({
    mutationFn: async (material: PickedMaterial) => {
      const { title, content } = await getMaterialContentForAi({
        data: { materialId: material.id },
      })
      if (content.length < 50) {
        throw new Error(
          'Not enough content to generate quiz. Please select a material with more content.',
        )
      }
      return generateQuiz({
        data: { materialTitle: title, materialContent: content },
      })
    },
    onSuccess: () => {
      setUserAnswers({})
      setIsSubmitted(false)
      setSavedToClassroom(false)
    },
  })

  const quiz = generateMutation.data?.quiz

  // lock the ai nav item (see sidebar.tsx) during a student's active attempt, unlock on submit/retry/unmount
  useEffect(() => {
    if (isInstructor) return
    if (quiz && !isSubmitted) {
      lockExam()
    } else {
      unlockExam()
    }
    return () => unlockExam()
  }, [quiz, isSubmitted, isInstructor, lockExam, unlockExam])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!quiz || !selectedSubjectId || !selectedMaterial) {
        throw new Error('Nothing to save.')
      }
      const material = await createMaterial({
        data: {
          subjectId: selectedSubjectId,
          title: `${selectedMaterial.title} — Quiz`,
          description: `AI-generated quiz from ${selectedMaterial.title}`,
          type: 'quiz',
          maxPoints: quiz.length * 10,
          published: false,
          allowLateSubmission: true,
          topicId: selectedMaterial.topic_id ?? undefined,
        },
      })
      await saveQuizQuestions({
        data: {
          materialId: material.id,
          questions: quiz.map((q) => ({
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
          })),
        },
      })
      return material
    },
    onSuccess: () => setSavedToClassroom(true),
  })

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return
    setUserAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }))
  }

  const handleSubmitQuiz = () => {
    setIsSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRetry = () => {
    setUserAnswers({})
    setIsSubmitted(false)
  }

  const score = (() => {
    if (!quiz) return { correct: 0, total: 0, percentage: 0 }
    let correct = 0
    quiz.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) correct++
    })
    return {
      correct,
      total: quiz.length,
      percentage: Math.round((correct / quiz.length) * 100),
    }
  })()

  const showAnswers = isSubmitted || isInstructor

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Brain className="text-classly-green" size={20} />
            Quiz Generator
          </h3>

          {generateMutation.isError && (
            <div className="mb-6 p-4 bg-destructive/8 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-destructive shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-destructive font-medium">
                {generateMutation.error.message}
              </p>
            </div>
          )}

          <MaterialPicker
            selectedSubjectId={selectedSubjectId}
            selectedMaterialId={selectedMaterial?.id ?? null}
            onSelectSubject={setSelectedSubjectId}
            onSelectMaterial={setSelectedMaterial}
            disabled={generateMutation.isPending}
          />

          <button
            onClick={() =>
              selectedMaterial && generateMutation.mutate(selectedMaterial)
            }
            disabled={!selectedMaterial || generateMutation.isPending}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing Content & Generating Questions...
              </>
            ) : (
              <>
                <Brain size={20} />
                Generate Quiz
              </>
            )}
          </button>
        </div>
      </div>

      {quiz && quiz.length > 0 && selectedMaterial && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-bold text-foreground text-xl">
                {selectedMaterial.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {quiz.length} Questions •{' '}
                {isInstructor ? 'Preview Mode' : 'Practice Mode'}
              </p>
            </div>

            {isSubmitted && !isInstructor && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-secondary transition-all shadow-sm"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            )}
          </div>

          {isInstructor && (
            <div className="mb-8 bg-classly-green/5 border border-classly-green/20 rounded-xl p-5">
              <p className="text-sm font-semibold text-foreground mb-1">
                Save to Classroom
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                This will create a draft quiz material — review it in the
                classroom and publish when you're ready for students to see
                it.
              </p>
              {saveMutation.isError && (
                <p className="text-xs text-destructive mb-3">
                  {saveMutation.error.message}
                </p>
              )}
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || savedToClassroom}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-all"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving...
                  </>
                ) : savedToClassroom ? (
                  <>
                    <Check size={16} /> Saved as Draft
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Save Quiz to Classroom
                  </>
                )}
              </button>
            </div>
          )}

          {isSubmitted && !isInstructor && (
            <div className="mb-8 p-6 bg-card border border-border rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                    score.percentage >= 70
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/8 text-warning'
                  }`}
                >
                  {score.percentage}%
                </div>
                <div>
                  <h5 className="font-bold text-foreground text-lg">
                    Quiz Complete!
                  </h5>
                  <p className="text-muted-foreground">
                    You answered {score.correct} out of {score.total} correctly
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto">
                {score.percentage >= 70 ? (
                  <div className="px-4 py-2 bg-success/10 text-success rounded-lg text-sm font-medium text-center">
                    Great job! You've mastered this material.
                  </div>
                ) : (
                  <div className="px-4 py-2 bg-warning/8 text-warning rounded-lg text-sm font-medium text-center">
                    Review the material and try again.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {quiz.map((q, idx) => (
              <QuizQuestionCard
                key={idx}
                question={q}
                index={idx}
                showAnswer={showAnswers}
                userAnswer={userAnswers[idx]}
                onAnswerSelect={handleAnswerSelect}
                isSubmitted={isSubmitted || isInstructor}
              />
            ))}
          </div>

          {!isSubmitted && !isInstructor && (
            <div className="mt-8 sticky bottom-6 z-10">
              <div className="bg-card/80 backdrop-blur-md p-4 rounded-2xl border border-border shadow-lg max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground font-medium pl-2">
                  {Object.keys(userAnswers).length} of {quiz.length} Answered
                </div>
                <button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(userAnswers).length !== quiz.length}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-md"
                >
                  Submit Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function QuizQuestionCard({
  question,
  index,
  showAnswer,
  userAnswer,
  onAnswerSelect,
  isSubmitted,
}: {
  question: QuizQuestion
  index: number
  showAnswer: boolean
  userAnswer: number | undefined
  onAnswerSelect: (questionIndex: number, optionIndex: number) => void
  isSubmitted: boolean
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="p-6">
        <div className="flex gap-4">
          <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground font-medium text-sm">
            {index + 1}
          </span>
          <p className="font-medium text-foreground text-lg flex-1 pt-0.5">
            {question.question}
          </p>
        </div>

        <div className="mt-6 space-y-3 pl-12">
          {question.options.map((option, optIdx) => {
            const isSelected = userAnswer === optIdx
            const isCorrect = optIdx === question.correctIndex

            const showCorrect = showAnswer && isCorrect
            const showWrong = showAnswer && isSelected && !isCorrect
            const isDimmed = showAnswer && !isCorrect && !isSelected

            let borderClass = 'border-border'
            let bgClass = 'bg-card'
            let textClass = 'text-foreground/80'
            let icon: ReactNode = null

            if (showCorrect) {
              borderClass = 'border-success ring-1 ring-success'
              bgClass = 'bg-success/5'
              textClass = 'text-success font-medium'
              icon = <Check size={18} className="text-success" />
            } else if (showWrong) {
              borderClass = 'border-destructive ring-1 ring-destructive'
              bgClass = 'bg-destructive/8'
              textClass = 'text-destructive font-medium'
              icon = <X size={18} className="text-destructive" />
            } else if (isSelected) {
              borderClass = 'border-classly-green ring-1 ring-classly-green'
              bgClass = 'bg-secondary'
              textClass = 'text-foreground font-medium'
            }

            return (
              <button
                key={optIdx}
                onClick={() => onAnswerSelect(index, optIdx)}
                disabled={isSubmitted}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative group ${borderClass} ${bgClass} ${
                  isDimmed ? 'opacity-50' : 'opacity-100'
                } ${!isSubmitted && !isSelected ? 'hover:border-classly-green hover:bg-secondary' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={textClass}>{option}</span>
                  {icon}
                  {!isSubmitted && isSelected && (
                    <div className="w-4 h-4 rounded-full bg-classly-green" />
                  )}
                  {!isSubmitted && !isSelected && (
                    <div className="w-4 h-4 rounded-full border border-input group-hover:border-classly-green transition-colors" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {showAnswer && question.explanation && (
        <div className="bg-secondary px-6 py-4 border-t border-border/60 ml-12 border-l border-l-gray-200">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Explanation:</span>{' '}
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  )
}