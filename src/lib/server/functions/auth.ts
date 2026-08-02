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
      }
    }

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentUserState> => {
    const supabase = getServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { status: 'unauthenticated' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, status')
      .eq('id', user.id)
      .single()
    // after email confirmation, the auth user exists but no profiles row has been inserted yet. completeProfileScreen handles this by inserting one
    if (!profile) {
      return { status: 'no-profile', email: user.email ?? '' }
    }

    return { status: profile.status, profile }
  },
)