import { createServerFn } from '@tanstack/react-start'
import { getServerSupabase } from '../supabase'

// cheap session + profile check for route-level beforeload gating (ux only)
// the real protection is in every server function's auth middleware, regardless of what this returns
export type CurrentUserState =
  | { status: 'unauthenticated' }
  | { status: 'no-profile'; email: string }
  | {
      status: 'pending' | 'rejected' | 'approved'
      profile: {
        id: string
        email: string
        full_name: string
        role: 'student' | 'instructor' | 'admin'
        status: 'pending' | 'approved' | 'rejected'
        avatar_url: string | null
        created_at: string | null
      }
    }

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentUserState> => {
    const supabase = getServerSupabase()
    const { data } = await supabase.auth.getClaims()

    if (!data) return { status: 'unauthenticated' }
    const { sub: userId, email: userEmail } = data.claims

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, status, avatar_url, created_at')
      .eq('id', userId)
      .single()
    if (!profile) {
      return { status: 'no-profile', email: userEmail ?? '' }
    }

    const role = profile.role
    const status = profile.status
    if (role !== 'student' && role !== 'instructor' && role !== 'admin') {
      throw new Error(`Unexpected profile role: ${role}`)
    }
    if (
      status !== 'pending' &&
      status !== 'approved' &&
      status !== 'rejected'
    ) {
      throw new Error(`Unexpected profile status: ${status}`)
    }

    return { status, profile: { ...profile, role, status } }
  },
)