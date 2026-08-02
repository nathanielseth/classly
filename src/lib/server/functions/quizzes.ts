import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../middleware'
import { assertSubjectAccess } from '../subject-access'
import type { getServerSupabase } from '../supabase'

const QUIZ_QUESTION_COLUMNS =
  'id, material_id, question, options, correct_index, order_index'

interface MaterialQuizContext {
  subjectId: string
  type: string
  published: boolean
}

async function getMaterialQuizContext(
  supabase: ReturnType<typeof getServerSupabase>,
  materialId: string,
): Promise<MaterialQuizContext> {
  const { data: material, error } = await supabase
    .from('materials')
    .select('subject_id, type, published')
    .eq('id', materialId)
    .single()

  if (error || !material) throw new Error('Material not found.')

  return {
    subjectId: material.subject_id,
    type: material.type ?? 'material',
    published: material.published ?? true,
  }
}

function assertQuizVisibleToCaller(
  profile: { role: string },
  materialCtx: MaterialQuizContext,
) {
  if (profile.role === 'student' && !materialCtx.published) {
    throw new Error('Quiz not found.')
  }
}

function assertCanManageQuizzes(profile: { role: string }) {
  if (profile.role !== 'instructor' && profile.role !== 'admin') {
    throw new Error('Only instructors can manage quiz questions.')
  }
}

const getQuizQuestionsInput = z.object({
  materialId: z.uuid(),
})

export const getQuizQuestions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(getQuizQuestionsInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    assertCanManageQuizzes(profile)

    const materialCtx = await getMaterialQuizContext(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, materialCtx.subjectId)

    const { data: questions, error } = await supabase
      .from('quiz_questions')
      .select(QUIZ_QUESTION_COLUMNS)
      .eq('material_id', data.materialId)
      .order('order_index', { ascending: true })

    if (error) throw new Error(error.message)
    return { questions: questions ?? [] }
  })

const quizQuestionInput = z.object({
  question: z.string().trim().min(1).max(1000),
  options: z.array(z.string().trim().min(1).max(300)).min(2).max(8),
  correctIndex: z.number().int().min(0),
})

const saveQuizQuestionsInput = z.object({
  materialId: z.uuid(),
  questions: z.array(quizQuestionInput).max(100),
})

export const saveQuizQuestions = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(saveQuizQuestionsInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context
    assertCanManageQuizzes(profile)

    const materialCtx = await getMaterialQuizContext(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, materialCtx.subjectId)

    if (materialCtx.type !== 'quiz') {
      throw new Error('Questions can only be saved to a quiz-type material.')
    }

    data.questions.forEach((q, i) => {
      if (q.correctIndex >= q.options.length) {
        throw new Error(
          `Question ${i + 1}: the correct answer must be one of its own options.`,
        )
      }
    })

    const { error: deleteError } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('material_id', data.materialId)
    if (deleteError) throw new Error(deleteError.message)

    if (data.questions.length === 0) {
      return { questions: [] }
    }

    const { data: questions, error } = await supabase
      .from('quiz_questions')
      .insert(
        data.questions.map((q, i) => ({
          material_id: data.materialId,
          question: q.question,
          options: q.options,
          correct_index: q.correctIndex,
          order_index: i,
        })),
      )
      .select(QUIZ_QUESTION_COLUMNS)
      .order('order_index', { ascending: true })

    if (error) throw new Error(error.message)
    return { questions }
  })

const getQuizForTakingInput = z.object({
  materialId: z.uuid(),
})

export const getQuizForTaking = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(getQuizForTakingInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      throw new Error('Only students take quizzes.')
    }

    const materialCtx = await getMaterialQuizContext(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, materialCtx.subjectId)
    assertQuizVisibleToCaller(profile, materialCtx)

    const { data: questions, error } = await supabase
      .from('quiz_questions')
      .select('id, question, options, order_index')
      .eq('material_id', data.materialId)
      .order('order_index', { ascending: true })

    if (error) throw new Error(error.message)
    return { questions: questions ?? [] }
  })

const getOwnQuizAttemptInput = z.object({
  materialId: z.uuid(),
})

export const getOwnQuizAttempt = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(getOwnQuizAttemptInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      throw new Error('Only students have their own quiz attempt.')
    }

    const materialCtx = await getMaterialQuizContext(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, materialCtx.subjectId)
    assertQuizVisibleToCaller(profile, materialCtx)

    const [
      { data: attempt, error: attemptError },
      { data: questions, error: qError },
    ] = await Promise.all([
      supabase
        .from('quiz_answers')
        .select('id, answers, score, total, submitted_at')
        .eq('material_id', data.materialId)
        .eq('student_id', profile.id)
        .maybeSingle(),
      supabase
        .from('quiz_questions')
        .select(QUIZ_QUESTION_COLUMNS)
        .eq('material_id', data.materialId)
        .order('order_index', { ascending: true }),
    ])

    if (attemptError) throw new Error(attemptError.message)
    if (qError) throw new Error(qError.message)

    return {
      attempt: attempt ?? null,
      questions: questions ?? [],
    }
  })

const submitQuizAttemptInput = z.object({
  materialId: z.uuid(),
  answers: z.record(z.string(), z.number().int().min(0)),
})

export const submitQuizAttempt = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(submitQuizAttemptInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      throw new Error('Only students can submit a quiz attempt.')
    }

    const materialCtx = await getMaterialQuizContext(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, materialCtx.subjectId)
    assertQuizVisibleToCaller(profile, materialCtx)

    const { data: questions, error: qError } = await supabase
      .from('quiz_questions')
      .select('correct_index, order_index')
      .eq('material_id', data.materialId)
      .order('order_index', { ascending: true })

    if (qError) throw new Error(qError.message)
    const orderedQuestions = questions ?? []

    if (orderedQuestions.length === 0) {
      throw new Error('This quiz has no questions yet.')
    }

    let score = 0
    orderedQuestions.forEach((q, i) => {
      if (data.answers[String(i)] === q.correct_index) score++
    })
    const total = orderedQuestions.length

    const { data: attempt, error } = await supabase
      .from('quiz_answers')
      .upsert(
        {
          material_id: data.materialId,
          student_id: profile.id,
          answers: data.answers,
          score,
          total,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'material_id,student_id' },
      )
      .select('id, answers, score, total, submitted_at')
      .single()

    if (error) throw new Error(error.message)
    return attempt
  })

const listQuizAttemptsInput = z.object({
  materialId: z.uuid(),
})

interface QuizAttemptRosterEntry {
  student: { id: string; full_name: string; email: string }
  attempt: {
    id: string
    score: number
    total: number
    submitted_at: string
  } | null
}

export const listQuizAttemptsForMaterial = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listQuizAttemptsInput)
  .handler(
    async ({
      data,
      context,
    }): Promise<{ roster: QuizAttemptRosterEntry[] }> => {
      const { supabase, profile } = context
      assertCanManageQuizzes(profile)

      const materialCtx = await getMaterialQuizContext(
        supabase,
        data.materialId,
      )
      await assertSubjectAccess(supabase, profile, materialCtx.subjectId)

      const enrollmentsQuery = supabase
        .from('enrollments')
        .select(
          'student:profiles!enrollments_student_id_fkey(id, full_name, email)',
        )
        .eq('subject_id', materialCtx.subjectId)

      const attemptsQuery = supabase
        .from('quiz_answers')
        .select('id, student_id, score, total, submitted_at')
        .eq('material_id', data.materialId)

      const [
        { data: enrollments, error: enrollError },
        { data: attempts, error: attemptError },
      ] = await Promise.all([enrollmentsQuery, attemptsQuery])

      if (enrollError) throw new Error(enrollError.message)
      if (attemptError) throw new Error(attemptError.message)

      const attemptByStudent = new Map(
        (attempts ?? []).map((a): [string, typeof a] => [a.student_id, a]),
      )

      const roster: QuizAttemptRosterEntry[] = (enrollments ?? []).map((e) => {
        const student = e.student
        if (!student)
          throw new Error('Enrollment is missing its student profile.')
        const attempt = attemptByStudent.get(student.id) ?? null
        return {
          student: {
            id: student.id,
            full_name: student.full_name,
            email: student.email,
          },
          attempt: attempt
            ? {
                id: attempt.id,
                score: attempt.score,
                total: attempt.total,
                submitted_at: attempt.submitted_at ?? new Date().toISOString(),
              }
            : null,
        }
      })

      return { roster }
    },
  )