import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getServerSupabase } from '../supabase'
import { dbError } from '../db-error'

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getServerSupabase()
  await supabase.auth.signOut()
})

const signInInput = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export const signIn = createServerFn({ method: 'POST' })
  .validator(signInInput)
  .handler(async ({ data }) => {
    const supabase = getServerSupabase()

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) throw new Error(error.message)
  })

const signUpInput = z.object({
  email: z.email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(['student', 'instructor']),
})

export const signUp = createServerFn({ method: 'POST' })
  .validator(signUpInput)
  .handler(async ({ data }) => {
    const supabase = getServerSupabase()

    // auth metadata holds full_name and role; the profiles row is
    // created later by completeProfile
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          role: data.role,
        },
      },
    })

    if (error) throw new Error(error.message)

    return { needsEmailConfirmation: !signUpData.session }
  })

const completeProfileInput = z.object({
  fullName: z.string().min(1),
  role: z.enum(['student', 'instructor']),
})

// inserts the profiles row for a user who already has an auth session but hasnt completed registration
export const completeProfile = createServerFn({ method: 'POST' })
  .validator(completeProfileInput)
  .handler(async ({ data }) => {
    const supabase = getServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Not signed in.')
    if (!user.email) throw new Error('Signed-in user has no email on file.')

    const isCvsuStudent =
      data.role === 'student' &&
      user.email.toLowerCase().endsWith('@cvsu.edu.ph')

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      full_name: data.fullName,
      role: data.role,
      status: isCvsuStudent ? 'approved' : 'pending',
    })

    if (error) throw dbError(error)
  })