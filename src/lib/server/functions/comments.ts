import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../middleware'
import { assertSubjectAccess } from '../subject-access'
import type { getServerSupabase } from '../supabase'

const COMMENT_COLUMNS =
  'id, material_id, author_id, content, is_private, created_at, updated_at'

interface CommentListItem {
  id: string
  material_id: string
  author_id: string
  content: string
  is_private: boolean | null
  created_at: string | null
  updated_at: string | null
  author: { id: string; full_name: string; role: string } | null
}

async function getMaterialSubjectId(
  supabase: ReturnType<typeof getServerSupabase>,
  materialId: string,
) {
  const { data: material, error } = await supabase
    .from('materials')
    .select('subject_id')
    .eq('id', materialId)
    .single()

  if (error || !material) throw new Error('Material not found.')
  return material.subject_id
}

function isInstructorRole(role: string) {
  return role === 'instructor' || role === 'admin'
}

const listClassCommentsInput = z.object({
  materialId: z.uuid(),
})

export const listClassComments = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listClassCommentsInput)
  .handler(
    async ({ data, context }): Promise<{ comments: CommentListItem[] }> => {
      const { supabase, profile } = context
      const subjectId = await getMaterialSubjectId(supabase, data.materialId)
      await assertSubjectAccess(supabase, profile, subjectId)

      const { data: comments, error } = await supabase
        .from('material_comments')
        .select(
          `
        ${COMMENT_COLUMNS},
        author:profiles!material_comments_author_id_fkey(id, full_name, role)
      `,
        )
        .eq('material_id', data.materialId)
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw new Error(error.message)

      return {
        comments: (comments ?? []).reverse(),
      }
    },
  )

const createClassCommentInput = z.object({
  materialId: z.uuid(),
  content: z.string().trim().min(1).max(3000),
})

export const createClassComment = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(createClassCommentInput)
  .handler(async ({ data, context }): Promise<CommentListItem> => {
    const { supabase, profile } = context
    const subjectId = await getMaterialSubjectId(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, subjectId)

    const { data: comment, error } = await supabase
      .from('material_comments')
      .insert({
        material_id: data.materialId,
        author_id: profile.id,
        content: data.content,
        is_private: false,
      })
      .select(
        `
        ${COMMENT_COLUMNS},
        author:profiles!material_comments_author_id_fkey(id, full_name, role)
      `,
      )
      .single()

    if (error) throw new Error(error.message)
    return comment
  })

async function resolvePrivateThreadStudentId(
  supabase: ReturnType<typeof getServerSupabase>,
  profile: { id: string; role: string },
  subjectId: string,
  requestedStudentId: string | undefined,
) {
  if (profile.role === 'student') {
    return profile.id
  }

  if (!isInstructorRole(profile.role)) {
    throw new Error("You don't have access to private comments.")
  }

  if (!requestedStudentId) {
    throw new Error('A student must be selected to view a private thread.')
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('student_id', requestedStudentId)
    .maybeSingle()

  if (!enrollment) {
    throw new Error('That student is not enrolled in this subject.')
  }

  return requestedStudentId
}

const listPrivateCommentsInput = z.object({
  materialId: z.uuid(),
  studentId: z.uuid().optional(),
})

export const listPrivateComments = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listPrivateCommentsInput)
  .handler(
    async ({ data, context }): Promise<{ comments: CommentListItem[] }> => {
      const { supabase, profile } = context
      const subjectId = await getMaterialSubjectId(supabase, data.materialId)
      await assertSubjectAccess(supabase, profile, subjectId)

      const studentId = await resolvePrivateThreadStudentId(
        supabase,
        profile,
        subjectId,
        data.studentId,
      )

      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('instructor_id')
        .eq('id', subjectId)
        .single()

      if (subjectError || !subject) throw new Error('Subject not found.')

      const instructorId = subject.instructor_id

      const { data: comments, error } = await supabase
        .from('material_comments')
        .select(
          `
        ${COMMENT_COLUMNS},
        author:profiles!material_comments_author_id_fkey(id, full_name, role)
      `,
        )
        .eq('material_id', data.materialId)
        .eq('is_private', true)
        .in('author_id', [studentId, instructorId])
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw new Error(error.message)

      return {
        comments: (comments ?? []).reverse(),
      }
    },
  )

const createPrivateCommentInput = z.object({
  materialId: z.uuid(),
  content: z.string().trim().min(1).max(3000),
  studentId: z.uuid().optional(),
})

export const createPrivateComment = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(createPrivateCommentInput)
  .handler(async ({ data, context }): Promise<CommentListItem> => {
    const { supabase, profile } = context
    const subjectId = await getMaterialSubjectId(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, subjectId)

    // verify the target student is enrolled before writing
    await resolvePrivateThreadStudentId(
      supabase,
      profile,
      subjectId,
      data.studentId,
    )

    const { data: comment, error } = await supabase
      .from('material_comments')
      .insert({
        material_id: data.materialId,
        author_id: profile.id,
        content: data.content,
        is_private: true,
      })
      .select(
        `
        ${COMMENT_COLUMNS},
        author:profiles!material_comments_author_id_fkey(id, full_name, role)
      `,
      )
      .single()

    if (error) throw new Error(error.message)
    return comment
  })

const listPrivateThreadStudentIdsInput = z.object({
  materialId: z.uuid(),
})

export const listPrivateThreadStudentIds = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listPrivateThreadStudentIdsInput)
  .handler(async ({ data, context }): Promise<{ studentIds: string[] }> => {
    const { supabase, profile } = context
    const subjectId = await getMaterialSubjectId(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, subjectId)

    if (!isInstructorRole(profile.role)) {
      return { studentIds: [] }
    }

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('instructor_id')
      .eq('id', subjectId)
      .single()

    if (subjectError || !subject) throw new Error('Subject not found.')

    const { data: rows, error } = await supabase
      .from('material_comments')
      .select('author_id')
      .eq('material_id', data.materialId)
      .eq('is_private', true)
      .neq('author_id', subject.instructor_id)

    if (error) throw new Error(error.message)

    const studentIds = Array.from(
      new Set<string>((rows ?? []).map((r) => r.author_id)),
    )
    return { studentIds }
  })

const deleteCommentInput = z.object({
  commentId: z.uuid(),
})

export const deleteComment = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(deleteCommentInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    const { data: comment, error: commentError } = await supabase
      .from('material_comments')
      .select('id, material_id, author_id')
      .eq('id', data.commentId)
      .maybeSingle()

    if (commentError) throw new Error(commentError.message)
    if (!comment) {
      throw new Error(
        "Comment not found or you don't have permission to delete it.",
      )
    }

    const isOwnComment = comment.author_id === profile.id
    const isAdmin = profile.role === 'admin'

    let isSubjectInstructor = false
    if (!isOwnComment && !isAdmin && profile.role === 'instructor') {
      const subjectId = await getMaterialSubjectId(
        supabase,
        comment.material_id,
      )
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('instructor_id')
        .eq('id', subjectId)
        .single()

      if (subjectError || !subject) throw new Error('Subject not found.')
      isSubjectInstructor = subject.instructor_id === profile.id
    }

    if (!isOwnComment && !isAdmin && !isSubjectInstructor) {
      throw new Error(
        "Comment not found or you don't have permission to delete it.",
      )
    }

    const { data: deleted, error } = await supabase
      .from('material_comments')
      .delete()
      .eq('id', data.commentId)
      .select('id')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!deleted) {
      throw new Error(
        "Comment not found or you don't have permission to delete it.",
      )
    }

    return { id: deleted.id }
  })