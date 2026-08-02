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
import { createMaterial } from '@/lib/server/functions/materials'
import { saveQuizQuestions } from '@/lib/server/functions/quizzes'
import { useExamLock } from '@/hooks/useExamLock'
import { MaterialPicker, materialToContentText } from './MaterialPicker'
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
    mutationFn: (material: PickedMaterial) => {
      const materialContent = materialToContentText(material)
      if (materialContent.length < 50) {
        throw new Error(
          'Not enough content to generate quiz. Please select a material with more content.',
        )
      }
      return generateQuiz({
        data: { materialTitle: material.title, materialContent },
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
          published: true,
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Brain className="text-classly-green" size={20} />
            Quiz Generator
          </h3>

          {generateMutation.isError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-600 font-medium">
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
            className="w-full py-3.5 bg-classly-green text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
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
              <h4 className="font-bold text-gray-900 text-xl">
                {selectedMaterial.title}
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                {quiz.length} Questions •{' '}
                {isInstructor ? 'Preview Mode' : 'Practice Mode'}
              </p>
            </div>

            {isSubmitted && !isInstructor && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            )}
          </div>

          {isInstructor && (
            <div className="mb-8 bg-classly-green/5 border border-classly-green/20 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Save to Classroom
              </p>
              <p className="text-xs text-gray-500 mb-4">
                This will create a new quiz material students can take
                digitally.
              </p>
              {saveMutation.isError && (
                <p className="text-xs text-red-600 mb-3">
                  {saveMutation.error.message}
                </p>
              )}
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || savedToClassroom}
                className="w-full py-2.5 bg-classly-green text-white rounded-lg font-medium hover:bg-classly-green/90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-all"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving...
                  </>
                ) : savedToClassroom ? (
                  <>
                    <Check size={16} /> Saved to Classroom
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
            <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                    score.percentage >= 70
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  {score.percentage}%
                </div>
                <div>
                  <h5 className="font-bold text-gray-900 text-lg">
                    Quiz Complete!
                  </h5>
                  <p className="text-gray-600">
                    You answered {score.correct} out of {score.total} correctly
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto">
                {score.percentage >= 70 ? (
                  <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium text-center">
                    Great job! You've mastered this material.
                  </div>
                ) : (
                  <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium text-center">
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
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-lg max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600 font-medium pl-2">
                  {Object.keys(userAnswers).length} of {quiz.length} Answered
                </div>
                <button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(userAnswers).length !== quiz.length}
                  className="px-8 py-3 bg-classly-green text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-md"
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="p-6">
        <div className="flex gap-4">
          <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 font-medium text-sm">
            {index + 1}
          </span>
          <p className="font-medium text-gray-900 text-lg flex-1 pt-0.5">
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

            let borderClass = 'border-gray-200'
            let bgClass = 'bg-white'
            let textClass = 'text-gray-700'
            let icon: ReactNode = null

            if (showCorrect) {
              borderClass = 'border-emerald-500 ring-1 ring-emerald-500'
              bgClass = 'bg-emerald-50/30'
              textClass = 'text-emerald-700 font-medium'
              icon = <Check size={18} className="text-emerald-600" />
            } else if (showWrong) {
              borderClass = 'border-red-500 ring-1 ring-red-500'
              bgClass = 'bg-red-50/30'
              textClass = 'text-red-700 font-medium'
              icon = <X size={18} className="text-red-600" />
            } else if (isSelected) {
              borderClass = 'border-classly-green ring-1 ring-classly-green'
              bgClass = 'bg-gray-50'
              textClass = 'text-gray-900 font-medium'
            }

            return (
              <button
                key={optIdx}
                onClick={() => onAnswerSelect(index, optIdx)}
                disabled={isSubmitted}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative group ${borderClass} ${bgClass} ${
                  isDimmed ? 'opacity-50' : 'opacity-100'
                } ${!isSubmitted && !isSelected ? 'hover:border-classly-green hover:bg-gray-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={textClass}>{option}</span>
                  {icon}
                  {!isSubmitted && isSelected && (
                    <div className="w-4 h-4 rounded-full bg-classly-green" />
                  )}
                  {!isSubmitted && !isSelected && (
                    <div className="w-4 h-4 rounded-full border border-gray-300 group-hover:border-classly-green transition-colors" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {showAnswer && question.explanation && (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 ml-12 border-l border-l-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">Explanation:</span>{' '}
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  )
}