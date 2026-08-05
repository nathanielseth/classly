import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../middleware'

const listSubjectsInput = z.object({
  includeArchived: z.boolean().default(false),
})

interface SubjectListItem {
  id: string
  code: string
  name: string
  description: string | null
  schedule: string | null
  room: string | null
  archived: boolean
  instructor: { id: string; full_name: string; email: string } | null
  enrollmentCount: number
  materialCount: number
  announcementCount: number
  // per-student dashboard card color
  accentColor: string | null
}

export const listSubjects = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listSubjectsInput)
  .handler(
    async ({ data, context }): Promise<{ subjects: SubjectListItem[] }> => {
      const { includeArchived } = data
      const { supabase, profile } = context

      if (profile.role === 'instructor' || profile.role === 'admin') {
        let query = supabase
          .from('subjects')
          .select(
            `
          id, code, name, description, schedule, room, archived,
          instructor:profiles!subjects_instructor_id_fkey(id, full_name, email),
          enrollments:enrollments(count),
          materials:materials(count),
          announcements:announcements(count)
        `,
          )
          .eq('instructor_id', profile.id)
          .order('name')

        if (!includeArchived) {
          query = query.eq('archived', false)
        }

        const { data: rows, error } = await query
        if (error) throw new Error(error.message)

        const subjects: SubjectListItem[] = (rows ?? []).map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
          schedule: row.schedule,
          room: row.room,
          archived: row.archived,
          instructor: row.instructor,
          enrollmentCount: row.enrollments[0].count,
          materialCount: row.materials[0].count,
          announcementCount: row.announcements[0].count,
          accentColor: null,
        }))

        return { subjects }
      }
      // students only see subjects they're enrolled in
      let query = supabase
        .from('enrollments')
        .select(
          `
        enrolled_at, accent_color,
        subject:subjects!enrollments_subject_id_fkey!inner(
          id, code, name, description, schedule, room, archived,
          instructor:profiles!subjects_instructor_id_fkey(id, full_name, email),
          materials:materials(count),
          announcements:announcements(count)
        )
      `,
        )
        .eq('student_id', profile.id)
        .order('enrolled_at', { ascending: false })

      if (!includeArchived) {
        query = query.eq('subject.archived', false)
      }

      const { data: enrollments, error } = await query
      if (error) throw new Error(error.message)

      const subjects: SubjectListItem[] = (enrollments ?? []).map((e) => {
        const row = e.subject
        return {
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
          schedule: row.schedule,
          room: row.room,
          archived: row.archived,
          instructor: row.instructor,
          enrollmentCount: 0, // students don't need the class roster size here
          materialCount: row.materials[0].count,
          announcementCount: row.announcements[0].count,
          accentColor: e.accent_color,
        }
      })

      return { subjects }
    },
  )

const getSubjectInput = z.object({
  subjectId: z.uuid(),
})

export const getSubject = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(getSubjectInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    const { data: subject, error } = await supabase
      .from('subjects')
      .select(
        `
        id, code, name, description, schedule, room, archived, created_at,
        instructor_id,
        instructor:profiles!subjects_instructor_id_fkey(id, full_name, email)
      `,
      )
      .eq('id', data.subjectId)
      .single()

    if (error) throw new Error('Subject not found.')

    if (profile.role === 'instructor' && subject.instructor_id !== profile.id) {
      throw new Error("You don't have access to this subject.")
    }

    if (profile.role === 'student') {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', profile.id)
        .eq('subject_id', data.subjectId)
        .maybeSingle()

      if (!enrollment) {
        throw new Error("You don't have access to this subject.")
      }
    }

    return subject
  })

function generateSubjectCode() {
  // exclude visually-ambiguous characters
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const createSubjectInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  schedule: z.string().trim().max(120).optional(),
  room: z.string().trim().max(60).optional(),
})

export const createSubject = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(createSubjectInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      throw new Error('Only instructors can create subjects.')
    }

    const maxAttempts = 5
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data: subject, error } = await supabase
        .from('subjects')
        .insert({
          code: generateSubjectCode(),
          name: data.name,
          description: data.description || null,
          schedule: data.schedule || null,
          room: data.room || null,
          instructor_id: profile.id,
        })
        .select(
          'id, code, name, description, schedule, room, archived, created_at',
        )
        .single()

      if (!error) return subject

      if (error.code !== '23505') throw new Error(error.message)
    }

    throw new Error(
      'Could not generate a unique subject code. Please try again.',
    )
  })

const archiveSubjectInput = z.object({
  subjectId: z.uuid(),
  archived: z.boolean(),
})

export const setSubjectArchived = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(archiveSubjectInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    let query = supabase
      .from('subjects')
      .update({ archived: data.archived, updated_at: new Date().toISOString() })
      .eq('id', data.subjectId)

    if (profile.role !== 'admin') {
      query = query.eq('instructor_id', profile.id)
    }

    const { data: subject, error } = await query.select('id, archived').single()

    if (error) {
      throw new Error(
        "Subject not found or you don't have permission to modify it.",
      )
    }

    return subject
  })

const updateSubjectInput = z.object({
  subjectId: z.uuid(),
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .transform((c) => c.toUpperCase()),
  description: z.string().trim().max(2000).optional(),
  schedule: z.string().trim().max(120).optional(),
  room: z.string().trim().max(60).optional(),
})

export const updateSubject = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(updateSubjectInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    let query = supabase
      .from('subjects')
      .update({
        name: data.name,
        code: data.code,
        description: data.description || null,
        schedule: data.schedule || null,
        room: data.room || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.subjectId)

    if (profile.role !== 'admin') {
      query = query.eq('instructor_id', profile.id)
    }

    const { data: subject, error } = await query
      .select(
        'id, code, name, description, schedule, room, archived, created_at',
      )
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('That subject code is already taken.')
      }
      throw new Error(
        "Subject not found or you don't have permission to modify it.",
      )
    }

    return subject
  })

const deleteSubjectInput = z.object({
  subjectId: z.uuid(),
})

// permanent delete cascades via FK to materials, announcements, and enrollments, unlike reversible subject archiving
export const deleteSubject = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(deleteSubjectInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      throw new Error('Only instructors can delete subjects.')
    }

    let query = supabase.from('subjects').delete().eq('id', data.subjectId)

    if (profile.role !== 'admin') {
      query = query.eq('instructor_id', profile.id)
    }

    const { data: deleted, error } = await query.select('id').maybeSingle()

    if (error) throw new Error(error.message)
    if (!deleted) {
      throw new Error(
        "Subject not found or you don't have permission to delete it.",
      )
    }

    return { id: deleted.id }
  })

const joinSubjectInput = z.object({
  code: z.string().trim().min(1).max(12),
})

export const joinSubjectByCode = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(joinSubjectInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      throw new Error('Only students can join subjects by code.')
    }

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name, archived')
      .eq('code', data.code.toUpperCase())
      .maybeSingle()

    if (subjectError) throw new Error(subjectError.message)
    if (!subject) throw new Error('No subject found with that code.')
    if (subject.archived)
      throw new Error(
        'This subject is archived and no longer accepting students.',
      )

    const { error: enrollError } = await supabase
      .from('enrollments')
      .insert({ student_id: profile.id, subject_id: subject.id })

    if (enrollError) {
      if (enrollError.code === '23505') {
        throw new Error("You're already enrolled in this subject.")
      }
      throw new Error(enrollError.message)
    }

    return { subjectId: subject.id, subjectName: subject.name }
  })