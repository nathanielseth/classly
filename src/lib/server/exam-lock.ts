import type { getServerSupabase } from './supabase'

type SupabaseClient = ReturnType<typeof getServerSupabase>

export async function hasOpenQuizSession(
  supabase: SupabaseClient,
  studentId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('student_id', studentId)
    .is('ended_at', null)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data !== null
}

export async function assertNoOpenQuizSession(
  supabase: SupabaseClient,
  profile: { id: string; role: string },
) {
  if (profile.role !== 'student') return
  if (await hasOpenQuizSession(supabase, profile.id)) {
    throw new Error('The AI assistant is disabled while a quiz is in progress.')
  }
}