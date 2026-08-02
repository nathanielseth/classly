import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../middleware'
import { assertSubjectAccess } from '../subject-access'
import type { getServerSupabase } from '../supabase'

const SUBMISSIONS_BUCKET = 'submission-files'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const SIGNED_URL_TTL_SECONDS = 60 * 10

const ALLOWED_SUBMISSION_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'zip',
  'txt',
  'jpg',
  'jpeg',
  'png',
])

function storagePathFromUrl(fileUrl: string) {
  const marker = `/${SUBMISSIONS_BUCKET}/`
  const index = fileUrl.indexOf(marker)
  if (index === -1) return null
  return fileUrl.slice(index + marker.length)
}

function isStoragePath(value: string) {
  return !value.startsWith('http://') && !value.startsWith('https://')
}

const SUBMISSION_COLUMNS =
  'id, material_id, student_id, content, file_url, file_name, file_size, status, grade, grade_percentage, feedback, is_late, submitted_at, graded_at, returned_at, created_at'

interface MaterialContext {
  subjectId: string
  dueDate: string | null
  maxPoints: number
  allowLateSubmission: boolean
}

async function getMaterialContext(
  supabase: ReturnType<typeof getServerSupabase>,
  materialId: string,
): Promise<MaterialContext> {
  const { data: material, error } = await supabase
    .from('materials')
    .select('subject_id, due_date, max_points, allow_late_submission')
    .eq('id', materialId)
    .single()

  if (error || !material) throw new Error('Material not found.')

  return {
    subjectId: material.subject_id,
    dueDate: material.due_date,
    maxPoints: material.max_points ?? 100,
    allowLateSubmission: material.allow_late_submission ?? true,
  }
}

async function assertSubmissionAccess(
  supabase: ReturnType<typeof getServerSupabase>,
  profile: { id: string; role: string },
  submissionId: string,
) {
  const { data: submission, error } = await supabase
    .from('submissions')
    .select('id, material_id, student_id')
    .eq('id', submissionId)
    .single()

  if (error || !submission) throw new Error('Submission not found.')

  const materialId = submission.material_id
  const studentId = submission.student_id
  const materialCtx = await getMaterialContext(supabase, materialId)

  if (profile.role === 'student' && studentId !== profile.id) {
    throw new Error("You don't have access to this submission.")
  }
  if (profile.role !== 'student') {
    await assertSubjectAccess(supabase, profile, materialCtx.subjectId)
  }

  return { materialId, studentId, materialCtx }
}

const getOwnSubmissionInput = z.object({
  materialId: z.uuid(),
})

export const getOwnSubmission = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(getOwnSubmissionInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      throw new Error('Only students have their own submission.')
    }

    const materialCtx = await getMaterialContext(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, materialCtx.subjectId)

    const { data: submission, error } = await supabase
      .from('submissions')
      .select(SUBMISSION_COLUMNS)
      .eq('material_id', data.materialId)
      .eq('student_id', profile.id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return submission
  })

const submitWorkInput = z.object({
  materialId: z.uuid(),
  content: z.string().trim().max(10000).optional(),
})

export const submitWork = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(submitWorkInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      throw new Error('Only students can submit work.')
    }

    const materialCtx = await getMaterialContext(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, materialCtx.subjectId)

    const now = new Date()
    const dueDate = materialCtx.dueDate ? new Date(materialCtx.dueDate) : null
    const isLate = dueDate !== null && now > dueDate

    if (isLate && !materialCtx.allowLateSubmission) {
      throw new Error(
        'The due date has passed and late submissions are not allowed for this material.',
      )
    }

    const { data: existing } = await supabase
      .from('submissions')
      .select('id, file_url, file_name, file_size')
      .eq('material_id', data.materialId)
      .eq('student_id', profile.id)
      .maybeSingle()

    if (!data.content?.trim() && !existing?.file_url) {
      throw new Error('Add some content or attach a file before turning in.')
    }

    const submissionData = {
      content: data.content?.trim() || null,
      status: isLate ? 'late' : 'submitted',
      is_late: isLate,
      submitted_at: now.toISOString(),
    }

    if (existing) {
      const { data: submission, error } = await supabase
        .from('submissions')
        .update(submissionData)
        .eq('id', existing.id)
        .select(SUBMISSION_COLUMNS)
        .single()
      if (error) throw new Error(error.message)
      return submission
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        material_id: data.materialId,
        student_id: profile.id,
        ...submissionData,
      })
      .select(SUBMISSION_COLUMNS)
      .single()

    if (error) throw new Error(error.message)
    return submission
  })

const unsubmitWorkInput = z.object({
  submissionId: z.uuid(),
})

export const unsubmitWork = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(unsubmitWorkInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      throw new Error('Only students can unsubmit their own work.')
    }

    const { studentId } = await assertSubmissionAccess(
      supabase,
      profile,
      data.submissionId,
    )
    if (studentId !== profile.id) {
      throw new Error("You don't have access to this submission.")
    }

    const { data: current, error: fetchError } = await supabase
      .from('submissions')
      .select('status')
      .eq('id', data.submissionId)
      .single()
    if (fetchError) throw new Error(fetchError.message)
    if (current.status === 'graded' || current.status === 'returned') {
      throw new Error('Graded work cannot be unsubmitted.')
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .update({ status: 'not_submitted', submitted_at: null, is_late: false })
      .eq('id', data.submissionId)
      .select(SUBMISSION_COLUMNS)
      .single()

    if (error) throw new Error(error.message)
    return submission
  })

export const uploadSubmissionFile = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((formData: unknown) => {
    if (!(formData instanceof FormData)) {
      throw new Error('Expected multipart form data.')
    }
    const materialId = formData.get('materialId')
    const file = formData.get('file')
    if (typeof materialId !== 'string' || !materialId) {
      throw new Error('materialId is required.')
    }
    if (!(file instanceof File)) {
      throw new Error('file is required.')
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 10MB.')
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !ALLOWED_SUBMISSION_EXTENSIONS.has(ext)) {
      throw new Error(
        'Unsupported file type. Allowed: PDF, Word, PowerPoint, Excel, ZIP, TXT, or image files.',
      )
    }
    return { materialId, file }
  })
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      throw new Error('Only students can attach a submission file.')
    }

    const materialCtx = await getMaterialContext(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, materialCtx.subjectId)

    const { data: existing } = await supabase
      .from('submissions')
      .select('id, file_url')
      .eq('material_id', data.materialId)
      .eq('student_id', profile.id)
      .maybeSingle()

    if (existing?.file_url && isStoragePath(existing.file_url)) {
      await supabase.storage
        .from(SUBMISSIONS_BUCKET)
        .remove([existing.file_url])
    }

    const fileExt = data.file.name.split('.').pop() ?? 'bin'
    const filePath = `submissions/${data.materialId}/${profile.id}_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from(SUBMISSIONS_BUCKET)
      .upload(filePath, data.file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw new Error(uploadError.message)

    const fileFields = {
      file_url: filePath,
      file_name: data.file.name,
      file_size: data.file.size,
    }

    if (existing) {
      const { data: submission, error } = await supabase
        .from('submissions')
        .update(fileFields)
        .eq('id', existing.id)
        .select(SUBMISSION_COLUMNS)
        .single()
      if (error) throw new Error(error.message)
      return submission
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        material_id: data.materialId,
        student_id: profile.id,
        status: 'not_submitted',
        ...fileFields,
      })
      .select(SUBMISSION_COLUMNS)
      .single()

    if (error) throw new Error(error.message)
    return submission
  })

const removeSubmissionFileInput = z.object({
  submissionId: z.uuid(),
})

export const removeSubmissionFile = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(removeSubmissionFileInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'student') {
      throw new Error('Only students can remove their own submission file.')
    }

    const { studentId } = await assertSubmissionAccess(
      supabase,
      profile,
      data.submissionId,
    )
    if (studentId !== profile.id) {
      throw new Error("You don't have access to this submission.")
    }

    const { data: existing } = await supabase
      .from('submissions')
      .select('file_url')
      .eq('id', data.submissionId)
      .single()

    if (existing?.file_url && isStoragePath(existing.file_url)) {
      await supabase.storage
        .from(SUBMISSIONS_BUCKET)
        .remove([existing.file_url])
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .update({ file_url: null, file_name: null, file_size: null })
      .eq('id', data.submissionId)
      .select(SUBMISSION_COLUMNS)
      .single()

    if (error) throw new Error(error.message)
    return submission
  })

const getSubmissionFileUrlInput = z.object({
  submissionId: z.uuid(),
})

export const getSubmissionFileUrl = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(getSubmissionFileUrlInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    const { materialCtx } = await assertSubmissionAccess(
      supabase,
      profile,
      data.submissionId,
    )
    void materialCtx

    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('file_url, file_name')
      .eq('id', data.submissionId)
      .single()
    if (fetchError) throw new Error(fetchError.message)
    if (!submission.file_url) throw new Error('This submission has no file.')

    const path = isStoragePath(submission.file_url)
      ? submission.file_url
      : storagePathFromUrl(submission.file_url)
    if (!path) throw new Error('This submission has no file.')

    const { data: signed, error } = await supabase.storage
      .from(SUBMISSIONS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

    if (error) throw new Error(error.message)
    return {
      url: signed.signedUrl,
      fileName: submission.file_name,
    }
  })

const listSubmissionsForMaterialInput = z.object({
  materialId: z.uuid(),
})

interface RosterEntry {
  student: { id: string; full_name: string; email: string }
  submission: {
    id: string
    content: string | null
    file_url: string | null
    file_name: string | null
    file_size: number | null
    status: string | null
    grade: number | null
    grade_percentage: number | null
    feedback: string | null
    is_late: boolean | null
    submitted_at: string | null
    graded_at: string | null
    returned_at: string | null
  } | null
}

export const listSubmissionsForMaterial = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listSubmissionsForMaterialInput)
  .handler(async ({ data, context }): Promise<{ roster: RosterEntry[] }> => {
    const { supabase, profile } = context

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      throw new Error('Only instructors can view submissions.')
    }

    const materialCtx = await getMaterialContext(supabase, data.materialId)
    await assertSubjectAccess(supabase, profile, materialCtx.subjectId)

    const [
      { data: enrollments, error: enrollError },
      { data: submissions, error: subError },
    ] = await Promise.all([
      supabase
        .from('enrollments')
        .select(
          'student:profiles!enrollments_student_id_fkey(id, full_name, email)',
        )
        .eq('subject_id', materialCtx.subjectId),
      supabase
        .from('submissions')
        .select(SUBMISSION_COLUMNS)
        .eq('material_id', data.materialId),
    ])

    if (enrollError) throw new Error(enrollError.message)
    if (subError) throw new Error(subError.message)

    const submissionByStudent = new Map(
      (submissions ?? []).map((s): [string, typeof s] => [s.student_id, s]),
    )

    const roster: RosterEntry[] = (enrollments ?? []).map((e) => {
      const student = e.student
      if (!student)
        throw new Error('Enrollment is missing its student profile.')
      const submission = submissionByStudent.get(student.id) ?? null
      return {
        student: {
          id: student.id,
          full_name: student.full_name,
          email: student.email,
        },
        submission: submission,
      }
    })

    return { roster }
  })

const gradeSubmissionInput = z.object({
  submissionId: z.uuid(),
  grade: z.number().int().min(0),
  feedback: z.string().trim().max(5000).optional(),
})

// grade and feedback are set together, status flips to "graded" and returned_at is left unset
export const gradeSubmission = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(gradeSubmissionInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      throw new Error('Only instructors can grade submissions.')
    }

    const { materialCtx } = await assertSubmissionAccess(
      supabase,
      profile,
      data.submissionId,
    )

    if (data.grade > materialCtx.maxPoints) {
      throw new Error(`Grade cannot exceed ${materialCtx.maxPoints} points.`)
    }

    const gradePercentage =
      materialCtx.maxPoints > 0
        ? Math.round((data.grade / materialCtx.maxPoints) * 100)
        : 0

    const { data: submission, error } = await supabase
      .from('submissions')
      .update({
        grade: data.grade,
        grade_percentage: gradePercentage,
        feedback: data.feedback?.trim() || null,
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .eq('id', data.submissionId)
      .select(SUBMISSION_COLUMNS)
      .single()

    if (error) throw new Error(error.message)
    return submission
  })

const returnSubmissionInput = z.object({
  submissionId: z.uuid(),
})

export const returnSubmission = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(returnSubmissionInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      throw new Error('Only instructors can return submissions.')
    }

    await assertSubmissionAccess(supabase, profile, data.submissionId)

    const { data: submission, error } = await supabase
      .from('submissions')
      .update({ status: 'returned', returned_at: new Date().toISOString() })
      .eq('id', data.submissionId)
      .select(SUBMISSION_COLUMNS)
      .single()

    if (error) throw new Error(error.message)
    return submission
  })