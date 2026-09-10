import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '../middleware'
import { dbError } from '../db-error'
import type { getServerSupabase } from '../supabase'

type SupabaseClient = ReturnType<typeof getServerSupabase>

interface NotificationItem {
  id: string
  title: string
  body: string
  created_at: string | null
  type: 'announcement' | 'submission' | 'pending'
}

const NOTIFICATION_LIMIT = 10

async function getStudentNotifications(
  supabase: SupabaseClient,
  studentId: string,
): Promise<NotificationItem[]> {
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('subject_id')
    .eq('student_id', studentId)

  if (enrollmentsError) throw dbError(enrollmentsError)

  const subjectIds = enrollments.map((e) => e.subject_id)
  if (subjectIds.length === 0) return []

  const { data: announcements, error: announcementsError } = await supabase
    .from('announcements')
    .select(
      'id, title, content, created_at, subject:subjects!announcements_subject_id_fkey(name)',
    )
    .in('subject_id', subjectIds)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATION_LIMIT)

  if (announcementsError) throw dbError(announcementsError)

  return announcements.map((a) => ({
    id: a.id,
    title: a.title || 'New Announcement',
    body: `${a.subject.name} · ${a.content.slice(0, 60)}${a.content.length > 60 ? '...' : ''}`,
    created_at: a.created_at,
    type: 'announcement' as const,
  }))
}

async function getInstructorNotifications(
  supabase: SupabaseClient,
  instructorId: string,
): Promise<NotificationItem[]> {
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id')
    .eq('instructor_id', instructorId)

  if (subjectsError) throw dbError(subjectsError)

  const subjectIds = subjects.map((s) => s.id)
  if (subjectIds.length === 0) return []

  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('id, title')
    .in('subject_id', subjectIds)

  if (materialsError) throw dbError(materialsError)

  const materialIds = materials.map((m) => m.id)
  if (materialIds.length === 0) return []

  const materialTitles = Object.fromEntries(
    materials.map((m) => [m.id, m.title]),
  )

  const { data: submissions, error: submissionsError } = await supabase
    .from('submissions')
    .select(
      'id, submitted_at, material_id, student:profiles!submissions_student_id_fkey(full_name)',
    )
    .in('material_id', materialIds)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(NOTIFICATION_LIMIT)

  if (submissionsError) throw dbError(submissionsError)

  return submissions.map((s) => ({
    id: s.id,
    title: 'New Submission',
    body: `${s.student.full_name} submitted ${materialTitles[s.material_id] ?? 'an assignment'}`,
    created_at: s.submitted_at,
    type: 'submission' as const,
  }))
}

async function getAdminNotifications(
  supabase: SupabaseClient,
): Promise<NotificationItem[]> {
  const { data: pending, error: pendingError } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(NOTIFICATION_LIMIT)

  if (pendingError) throw dbError(pendingError)

  return pending.map((u) => ({
    id: u.id,
    title: 'Pending Approval',
    body: `${u.full_name} (${u.role}) is waiting for approval`,
    created_at: u.created_at,
    type: 'pending' as const,
  }))
}

export const getNotifications = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ items: NotificationItem[] }> => {
    const { supabase, profile } = context

    const items =
      profile.role === 'student'
        ? await getStudentNotifications(supabase, profile.id)
        : profile.role === 'instructor'
          ? await getInstructorNotifications(supabase, profile.id)
          : await getAdminNotifications(supabase)

    return { items }
  })