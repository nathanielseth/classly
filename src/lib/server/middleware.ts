import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { getServerSupabase } from './supabase'

// verifies a valid supabase session
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const supabase = getServerSupabase()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      throw redirect({ to: '/login' })
    }

    // load profile once so downstream handlers do not each requery it
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, status, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.status !== 'approved') {
      throw redirect({ to: '/login' })
    }

    return next({
      context: {
        user,
        profile,
        supabase,
      },
    })
  },
)

// chain after authmiddleware for admin-only server functions
export const adminOnlyMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (context.profile.role !== 'admin') {
      throw new Error('Forbidden: admin access required')
    }
    return next()
  })