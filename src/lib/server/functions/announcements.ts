import { createServerFn } from '@tanstack/react-start'
import { dbError } from '../db-error'
import { z } from 'zod'
import { authMiddleware } from '../middleware'
import { assertSubjectAccess } from '../subject-access'

const listAnnouncementsInput = z.object({
  subjectId: z.uuid(),
})

interface AnnouncementListItem {
  id: string
  title: string | null
  content: string
  pinned: boolean | null
  created_at: string | null
  updated_at: string | null
  author: { id: string; full_name: string; role: string } | null
}

export const listAnnouncements = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listAnnouncementsInput)
  .handler(
    async ({
      data,
      context,
    }): Promise<{ announcements: AnnouncementListItem[] }> => {
      const { supabase, profile } = context
      await assertSubjectAccess(supabase, profile, data.subjectId)

      const { data: announcements, error } = await supabase
        .from('announcements')
        .select(
          `
        id, title, content, pinned, created_at, updated_at,
        author:profiles!announcements_author_id_fkey(id, full_name, role)
      `,
        )
        .eq('subject_id', data.subjectId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(75)

      if (error) throw dbError(error)

      return {
        announcements: announcements,
      }
    },
  )

const createAnnouncementInput = z.object({
  subjectId: z.uuid(),
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1).max(5000),
  pinned: z.boolean().default(false),
})

export const createAnnouncement = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(createAnnouncementInput)
  .handler(async ({ data, context }): Promise<AnnouncementListItem> => {
    const { supabase, profile } = context

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      throw new Error('Only instructors can post announcements.')
    }

    await assertSubjectAccess(supabase, profile, data.subjectId)

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        subject_id: data.subjectId,
        author_id: profile.id,
        title: data.title || null,
        content: data.content,
        pinned: data.pinned,
      })
      .select(
        `
        id, title, content, pinned, created_at, updated_at,
        author:profiles!announcements_author_id_fkey(id, full_name, role)
      `,
      )
      .single()

    if (error) throw dbError(error)

    return announcement
  })

const updateAnnouncementInput = z.object({
  announcementId: z.uuid(),
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1).max(5000),
})

// edits are scoped to the author (or an admin) via the update's .eq chain rather than a separate select-then-check
export const updateAnnouncement = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(updateAnnouncementInput)
  .handler(async ({ data, context }): Promise<AnnouncementListItem> => {
    const { supabase, profile } = context

    let query = supabase
      .from('announcements')
      .update({
        title: data.title || null,
        content: data.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.announcementId)

    if (profile.role !== 'admin') {
      query = query.eq('author_id', profile.id)
    }

    const { data: announcement, error } = await query
      .select(
        `
        id, title, content, pinned, created_at, updated_at,
        author:profiles!announcements_author_id_fkey(id, full_name, role)
      `,
      )
      .single()

    if (error) {
      throw new Error(
        "Announcement not found or you don't have permission to edit it.",
      )
    }

    return announcement
  })

const setAnnouncementPinnedInput = z.object({
  announcementId: z.uuid(),
  pinned: z.boolean(),
})

export const setAnnouncementPinned = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(setAnnouncementPinnedInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    let query = supabase
      .from('announcements')
      .update({ pinned: data.pinned, updated_at: new Date().toISOString() })
      .eq('id', data.announcementId)

    if (profile.role !== 'admin') {
      query = query.eq('author_id', profile.id)
    }

    const { data: announcement, error } = await query
      .select('id, pinned')
      .single()

    if (error) {
      throw new Error(
        "Announcement not found or you don't have permission to modify it.",
      )
    }

    return announcement
  })

const deleteAnnouncementInput = z.object({
  announcementId: z.uuid(),
})

export const deleteAnnouncement = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(deleteAnnouncementInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    let query = supabase
      .from('announcements')
      .delete()
      .eq('id', data.announcementId)

    if (profile.role !== 'admin') {
      query = query.eq('author_id', profile.id)
    }

    const { data: deleted, error } = await query.select('id').maybeSingle()

    if (error) throw dbError(error)
    if (!deleted) {
      throw new Error(
        "Announcement not found or you don't have permission to delete it.",
      )
    }

    return { id: deleted.id }
  })