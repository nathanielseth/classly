import { createServerFn } from '@tanstack/react-start'
import { dbError } from '../db-error'
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

export const ENROLLMENTS_SAFETY_CAP = 500

export const listEnrollments = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listEnrollmentsInput)
  .handler(
    async ({
      data,
      context,
    }): Promise<{ enrollments: EnrollmentListItem[]; truncated: boolean }> => {
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
        .limit(ENROLLMENTS_SAFETY_CAP + 1)

      if (error) throw dbError(error)

      const rows = enrollments
      const truncated = rows.length > ENROLLMENTS_SAFETY_CAP

      return {
        enrollments: rows.slice(0, ENROLLMENTS_SAFETY_CAP).map((e) => {
          const student = e.student
          return {
            ...e,
            student: { ...student, email: canManage ? student.email : null },
          }
        }),
        truncated,
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

    if (error) throw dbError(error)
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

    const isSelfUnenroll =
      profile.role === 'student' && profile.id === data.studentId
    const canManageOthers =
      profile.role === 'instructor' || profile.role === 'admin'

    if (!isSelfUnenroll && !canManageOthers) {
      throw new Error('You can only unenroll yourself from a subject.')
    }

    // students can always unenroll themselves without instructor roster checks
    if (!isSelfUnenroll) {
      await assertSubjectAccess(supabase, profile, data.subjectId)
    }

    const { data: deleted, error } = await supabase
      .from('enrollments')
      .delete()
      .eq('subject_id', data.subjectId)
      .eq('student_id', data.studentId)
      .select('id')
      .maybeSingle()

    if (error) throw dbError(error)
    if (!deleted) throw new Error('That student is not enrolled in this class.')

    return { id: deleted.id }
  })