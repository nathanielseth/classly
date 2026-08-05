import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { adminOnlyMiddleware } from '../middleware'
import { getIsolatedServerSupabase } from '../supabase'

const listUsersInput = z.object({
  search: z.string().optional(),
  role: z.enum(['all', 'student', 'instructor', 'admin']).default('all'),
  status: z.enum(['all', 'pending', 'approved', 'rejected']).default('all'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
})

export const listUsers = createServerFn({ method: 'GET' })
  .middleware([adminOnlyMiddleware])
  .validator(listUsersInput)
  .handler(async ({ data, context }) => {
    const { search, role, status, page, pageSize } = data
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = context.supabase
      .from('profiles')
      .select('id, full_name, email, role, status, created_at', {
        count: 'exact',
      })

    if (search) {
      // escape postgrest's .or() delimiter (,) and ilike wildcard (%)
      const q = search.replace(/[%,]/g, '')
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    }
    if (role !== 'all') query = query.eq('role', role)
    if (status !== 'all') query = query.eq('status', status)

    const {
      data: users,
      error,
      count,
    } = await query.order('created_at', { ascending: false }).range(from, to)

    if (error) throw new Error(error.message)

    return { users: users ?? [], total: count ?? 0, page, pageSize }
  })

const userIdInput = z.object({
  userId: z.uuid(),
})

// uses head-count queries instead of fetching full rows to measure .length
interface UserDetail {
  id: string
  full_name: string
  email: string
  role: string
  status: string
  created_at: string | null
  stats:
    | { enrollmentCount: number; submissionCount: number }
    | { subjectCount: number; materialCount: number }
    | null
}

export const getUserDetail = createServerFn({ method: 'GET' })
  .middleware([adminOnlyMiddleware])
  .validator(userIdInput)
  .handler(async ({ data, context }): Promise<UserDetail> => {
    const { supabase } = context

    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, status, created_at')
      .eq('id', data.userId)
      .single()

    if (error) throw new Error('User not found.')

    if (user.role === 'student') {
      const [enrollments, submissions] = await Promise.all([
        supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', user.id),
        supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', user.id),
      ])

      return {
        ...user,
        stats: {
          enrollmentCount: enrollments.count ?? 0,
          submissionCount: submissions.count ?? 0,
        },
      }
    }

    if (user.role === 'instructor') {
      const [subjects, materials] = await Promise.all([
        supabase
          .from('subjects')
          .select('id', { count: 'exact', head: true })
          .eq('instructor_id', user.id),
        supabase
          .from('materials')
          .select('id, subject:subjects!inner(instructor_id)', {
            count: 'exact',
            head: true,
          })
          .eq('subject.instructor_id', user.id),
      ])

      return {
        ...user,
        stats: {
          subjectCount: subjects.count ?? 0,
          materialCount: materials.count ?? 0,
        },
      }
    }

    return { ...user, stats: null }
  })

// non-cvsu signups land as "pending" and authmiddleware blocks any status
// other than "approved" at the login gate, so without this a pending
// account is permanently stuck
export const approveUser = createServerFn({ method: 'POST' })
  .middleware([adminOnlyMiddleware])
  .validator(userIdInput)
  .handler(async ({ data, context }) => {
    const { data: user, error } = await context.supabase
      .from('profiles')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', data.userId)
      .select('id, status')
      .single()

    if (error) throw new Error(error.message)
    return user
  })

export const rejectUser = createServerFn({ method: 'POST' })
  .middleware([adminOnlyMiddleware])
  .validator(userIdInput)
  .handler(async ({ data, context }) => {
    const { data: user, error } = await context.supabase
      .from('profiles')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', data.userId)
      .select('id, status')
      .single()

    if (error) throw new Error(error.message)
    return user
  })

const updateUserInput = z.object({
  userId: z.uuid(),
  fullName: z.string().trim().min(1).max(200),
  role: z.enum(['student', 'instructor', 'admin']),
})

export const updateUser = createServerFn({ method: 'POST' })
  .middleware([adminOnlyMiddleware])
  .validator(updateUserInput)
  .handler(async ({ data, context }) => {
    const { data: currentUser, error: fetchError } = await context.supabase
      .from('profiles')
      .select('role')
      .eq('id', data.userId)
      .single()

    if (fetchError || !currentUser) throw new Error('User not found.')

    if (currentUser.role === 'instructor' && data.role === 'student') {
      const { count, error: subjectError } = await context.supabase
        .from('subjects')
        .select('id', { count: 'exact', head: true })
        .eq('instructor_id', data.userId)

      if (subjectError) throw new Error(subjectError.message)

      if (count && count > 0) {
        throw new Error(
          `This instructor still owns ${count} subject${count === 1 ? '' : 's'}. Reassign or archive ${count === 1 ? 'it' : 'them'} before changing this user's role.`,
        )
      }
    }

    const { data: user, error } = await context.supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        role: data.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.userId)
      .select('id, full_name, email, role, status, created_at')
      .single()

    if (error) throw new Error(error.message)
    return user
  })

export const deleteUser = createServerFn({ method: 'POST' })
  .middleware([adminOnlyMiddleware])
  .validator(userIdInput)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('profiles')
      .delete()
      .eq('id', data.userId)

    if (error) {
      // dead
      if (error.code === '23503') {
        throw new Error(
          'This user still has related records that block deletion. This should not happen given the current cascade setup - check for a recent schema change.',
        )
      }
      throw new Error(error.message)
    }
    return { id: data.userId }
  })

const createUserInput = z.object({
  email: z.email(),
  password: z.string().min(6),
  fullName: z.string().trim().min(1).max(200),
  role: z.enum(['student', 'instructor', 'admin']),
})

export const createUser = createServerFn({ method: 'POST' })
  .middleware([adminOnlyMiddleware])
  .validator(createUserInput)
  .handler(async ({ data, context }) => {
    const isolatedSupabase = getIsolatedServerSupabase()

    const { data: signUpData, error: signUpError } =
      await isolatedSupabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { full_name: data.fullName, role: data.role } },
      })

    if (signUpError) throw new Error(signUpError.message)
    const newUserId = signUpData.user?.id
    if (!newUserId) throw new Error('Failed to create auth user.')

    // admin‑created accounts bypass the pending queue
    const { data: profile, error: profileError } = await context.supabase
      .from('profiles')
      .insert({
        id: newUserId,
        email: data.email,
        full_name: data.fullName,
        role: data.role,
        status: 'approved',
      })
      .select('id, full_name, email, role, status, created_at')
      .single()

    if (profileError) {
      // orphaned auth users without an approved profile cannot sign in, so leaving them for cleanup is safe
      throw new Error(
        `Auth account was created but the profile insert failed: ${profileError.message}`,
      )
    }

    return profile
  })