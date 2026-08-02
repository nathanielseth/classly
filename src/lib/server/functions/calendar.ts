import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../middleware'

const listCalendarItemsInput = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
})

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  event_time: string | null
  type: string
  source: 'event'
}

interface CalendarDueDate {
  id: string
  title: string
  due_date: string
  type: string
  subjectName: string
  subjectCode: string
  source: 'due_date'
}

export const listCalendarItems = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listCalendarItemsInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    // system events are visible to everyone
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, description, event_date, event_time, type')
      .gte('event_date', data.from)
      .lte('event_date', data.to)
      .order('event_date', { ascending: true })

    if (eventsError) throw new Error(eventsError.message)

    const calendarEvents: CalendarEvent[] = (events ?? []).map((e) => ({
      ...e,
      type: e.type ?? 'event',
      source: 'event',
    }))

    let dueDates: CalendarDueDate[] = []

    if (profile.role === 'student') {
      const { data: materials, error } = await supabase
        .from('materials')
        .select(
          `
          id, title, type, due_date,
          subject:subjects!inner(
            id, name, code,
            enrollments!inner(student_id)
          )
        `,
        )
        .eq('subject.enrollments.student_id', profile.id)
        .eq('published', true)
        .not('due_date', 'is', null)
        .gte('due_date', data.from)
        .lte('due_date', data.to)
        .order('due_date', { ascending: true })

      if (error) throw new Error(error.message)

      dueDates = (materials ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        due_date: m.due_date!,
        type: m.type ?? 'material',
        subjectName: m.subject?.name ?? '',
        subjectCode: m.subject?.code ?? '',
        source: 'due_date' as const,
      }))
    } else if (profile.role === 'instructor' || profile.role === 'admin') {
      let query = supabase
        .from('materials')
        .select(
          `
          id, title, type, due_date,
          subject:subjects!inner(id, name, code, instructor_id)
        `,
        )
        .not('due_date', 'is', null)
        .gte('due_date', data.from)
        .lte('due_date', data.to)
        .order('due_date', { ascending: true })

      if (profile.role === 'instructor') {
        query = query.eq('subject.instructor_id', profile.id)
      }

      const { data: materials, error } = await query
      if (error) throw new Error(error.message)

      dueDates = (materials ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        due_date: m.due_date!,
        type: m.type ?? 'material',
        subjectName: m.subject?.name ?? '',
        subjectCode: m.subject?.code ?? '',
        source: 'due_date' as const,
      }))
    }

    return { events: calendarEvents, dueDates }
  })

const createEventInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  eventDate: z.string().min(1),
  eventTime: z.string().trim().max(20).optional(),
  type: z.enum(['event', 'holiday', 'announcement']).default('event'),
})

export const createEvent = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(createEventInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'admin') {
      throw new Error('Only admins can add system events.')
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        title: data.title,
        description: data.description || null,
        event_date: data.eventDate,
        event_time: data.eventTime || null,
        type: data.type,
        created_by: profile.id,
      })
      .select('id, title, description, event_date, event_time, type')
      .single()

    if (error) throw new Error(error.message)
    return event
  })

const deleteEventInput = z.object({
  eventId: z.uuid(),
})

export const deleteEvent = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(deleteEventInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (profile.role !== 'admin') {
      throw new Error('Only admins can delete system events.')
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', data.eventId)
    if (error) throw new Error(error.message)

    return { id: data.eventId }
  })