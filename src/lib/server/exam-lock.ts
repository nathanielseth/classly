import type { getServerSupabase } from './supabase'

type SupabaseClient = ReturnType<typeof getServerSupabase>

// true if a student has an open quiz, with the client hook only mirroring for UI
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

// throws if a student has an open quiz, blocking server functions that must be unavailable mid‑exam
export async function assertNoOpenQuizSession(
  supabase: SupabaseClient,
  profile: { id: string; role: string },
) {
  if (profile.role !== 'student') return
  if (await hasOpenQuizSession(supabase, profile.id)) {
    throw new Error('The AI assistant is disabled while a quiz is in progress.')
  }
}
