import { createServerFn } from '@tanstack/react-start'
import { dbError } from '../db-error'
import { adminOnlyMiddleware } from '../middleware'

export const getSystemStats = createServerFn({ method: 'GET' })
  .middleware([adminOnlyMiddleware])
  .handler(async ({ context }) => {
    const { supabase } = context

    const [
      totalUsers,
      students,
      instructors,
      admins,
      subjects,
      enrollments,
      materials,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'student'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'instructor'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin'),
      supabase.from('subjects').select('id', { count: 'exact', head: true }),
      supabase.from('enrollments').select('id', { count: 'exact', head: true }),
      supabase.from('materials').select('id', { count: 'exact', head: true }),
    ])

    for (const result of [
      totalUsers,
      students,
      instructors,
      admins,
      subjects,
      enrollments,
      materials,
    ]) {
      if (result.error) throw dbError(result.error)
    }

    return {
      totalUsers: totalUsers.count ?? 0,
      totalStudents: students.count ?? 0,
      totalInstructors: instructors.count ?? 0,
      totalAdmins: admins.count ?? 0,
      totalSubjects: subjects.count ?? 0,
      totalEnrollments: enrollments.count ?? 0,
      totalMaterials: materials.count ?? 0,
    }
  })

const RECENT_USERS_LIMIT = 5

export const getRecentUsers = createServerFn({ method: 'GET' })
  .middleware([adminOnlyMiddleware])
  .handler(async ({ context }) => {
    const { data: users, error } = await context.supabase
      .from('profiles')
      .select('id, full_name, email, role, status, created_at')
      .order('created_at', { ascending: false })
      .limit(RECENT_USERS_LIMIT)

    if (error) throw dbError(error)

    return { users: users }
  })

export const getWeeklyActivity = createServerFn({ method: 'GET' })
  .middleware([adminOnlyMiddleware])
  .handler(async ({ context }) => {
    const { supabase } = context
    const since = new Date()
    since.setDate(since.getDate() - 7)
    const sinceIso = since.toISOString()

    const [newUsers, newSubjects, newEnrollments, newSubmissions] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sinceIso),
        supabase
          .from('subjects')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sinceIso),
        supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .gte('enrolled_at', sinceIso),
        supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .gte('submitted_at', sinceIso),
      ])

    // a failed head-count query previously fell through silently
    if (newUsers.error) throw dbError(newUsers.error)
    if (newSubjects.error) throw dbError(newSubjects.error)
    if (newEnrollments.error) throw dbError(newEnrollments.error)
    if (newSubmissions.error) throw dbError(newSubmissions.error)

    return {
      newUsers: newUsers.count ?? 0,
      newSubjects: newSubjects.count ?? 0,
      newEnrollments: newEnrollments.count ?? 0,
      newSubmissions: newSubmissions.count ?? 0,
      periodDays: 7,
    }
  })