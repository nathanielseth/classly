import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../middleware'
import { assertSubjectAccess } from '../subject-access'

const listEnrollmentsInput = z.object({
  subjectId: z.uuid(),
})

interface EnrollmentListItem {
  id: string
  enrolled_at: string | null
  student: {
    id: string
    full_name: string
    email: string | null
    role: string
  } | null
}

export const listEnrollments = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listEnrollmentsInput)
  .handler(
    async ({
      data,
      context,
    }): Promise<{ enrollments: EnrollmentListItem[] }> => {
      const { supabase, profile } = context
      await assertSubjectAccess(supabase, profile, data.subjectId)

      const canManage =
        profile.role === 'instructor' || profile.role === 'admin'

      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(
          `
        id, enrolled_at,
        student:profiles!enrollments_student_id_fkey(id, full_name, email, role)
      `,
        )
        .eq('subject_id', data.subjectId)
        .order('enrolled_at', { ascending: false })

      if (error) throw new Error(error.message)

      return {
        enrollments: (enrollments ?? []).map((e) => {
          const student = e.student
          return {
            ...e,
            student: student
              ? { ...student, email: canManage ? student.email : null }
              : null,
          }
        }),
      }
    },
  )

const ACCENT_COLORS = [
  'classly-green',
  'classly-gold',
  'blue-500',
  'purple-500',
  'pink-500',
  'red-500',
] as const

const setAccentColorInput = z.object({
  subjectId: z.uuid(),
  accentColor: z.enum(ACCENT_COLORS),
})

export const setEnrollmentAccentColor = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(setAccentColorInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      throw new Error('Only students can set a class color.')
    }

    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .update({ accent_color: data.accentColor })
      .eq('subject_id', data.subjectId)
      .eq('student_id', profile.id)
      .select('id, accent_color')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!enrollment) throw new Error('You are not enrolled in this subject.')

    return { accentColor: enrollment.accent_color }
  })

const unenrollStudentInput = z.object({
  subjectId: z.uuid(),
  studentId: z.uuid(),
})

export const unenrollStudent = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(unenrollStudentInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      throw new Error('Only instructors can remove students.')
    }

    await assertSubjectAccess(supabase, profile, data.subjectId)

    const { data: deleted, error } = await supabase
      .from('enrollments')
      .delete()
      .eq('subject_id', data.subjectId)
      .eq('student_id', data.studentId)
      .select('id')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!deleted) throw new Error('That student is not enrolled in this class.')

    return { id: deleted.id }
  })