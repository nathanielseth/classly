import type { getServerSupabase } from './supabase'

type SupabaseClient = ReturnType<typeof getServerSupabase>

export async function assertSubjectAccess(
  supabase: SupabaseClient,
  profile: { id: string; role: string },
  subjectId: string,
) {
  const { data: subject, error } = await supabase
    .from('subjects')
    .select('id, instructor_id')
    .eq('id', subjectId)
    .single()

  if (error || !subject) throw new Error('Subject not found.')

  if (profile.role === 'instructor') {
    if (subject.instructor_id !== profile.id) {
      throw new Error("You don't have access to this subject.")
    }
    return
  }

  if (profile.role === 'student') {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', profile.id)
      .eq('subject_id', subjectId)
      .maybeSingle()

    if (!enrollment) {
      throw new Error("You don't have access to this subject.")
    }
  }

  // admin: no further check
}
