import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '../middleware'
import type { getServerSupabase } from '../supabase'

type SupabaseClient = ReturnType<typeof getServerSupabase>

const PREVIEW_LENGTH = 40

function truncate(content: string) {
  return content.length > PREVIEW_LENGTH
    ? content.slice(0, PREVIEW_LENGTH) + '...'
    : content
}
interface ConversationListItem {
  id: string
  last_message_at: string | null
  otherUser: {
    id: string
    full_name: string
    email: string
    role: string
    avatar_url: string | null
  }
  preview: string | null
}

export const listDirectMessages = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(
    async ({ context }): Promise<{ conversations: ConversationListItem[] }> => {
      const { supabase, profile } = context

      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(
          `
        id, last_message_at,
        participant_one_profile:profiles!conversations_participant_one_fkey(id, full_name, email, role, avatar_url),
        participant_two_profile:profiles!conversations_participant_two_fkey(id, full_name, email, role, avatar_url),
        messages(content, created_at)
      `,
        )
        .or(`participant_one.eq.${profile.id},participant_two.eq.${profile.id}`)
        .order('last_message_at', { ascending: false })
        .order('created_at', { referencedTable: 'messages', ascending: false })
        .limit(1, { referencedTable: 'messages' })
        .limit(50)

      if (error) throw new Error(error.message)

      return {
        conversations: (conversations ?? [])
          .map((c) => {
            const one = c.participant_one_profile
            const two = c.participant_two_profile

            // both participant fks cascade on delete; a null embed means we cant resolve who "the other user" is without risking a  wrong match. skip the row instead of guessing
            if (!one || !two) return null

            const otherUser = one.id === profile.id ? two : one
            const last = c.messages[0] ?? null

            return {
              id: c.id,
              last_message_at: c.last_message_at,
              otherUser,
              preview: last ? truncate(last.content) : null,
            }
          })
          .filter((c): c is ConversationListItem => c !== null),
      }
    },
  )

const getOrCreateDirectConversationInput = z.object({
  otherUserId: z.uuid(),
})

export const getOrCreateDirectConversation = createServerFn({
  method: 'POST',
})
  .middleware([authMiddleware])
  .validator(getOrCreateDirectConversationInput)
  .handler(async ({ data, context }) => {
    const { supabase, profile } = context

    if (data.otherUserId === profile.id) {
      throw new Error("You can't message yourself.")
    }

    const { data: other, error: otherError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('id', data.otherUserId)
      .eq('status', 'approved')
      .maybeSingle()

    if (otherError) throw new Error(otherError.message)
    if (!other) throw new Error('That user could not be found.')

    // students may only dm staff, never other students
    if (profile.role === 'student' && other.role === 'student') {
      throw new Error('Direct messages between students are not allowed.')
    }

    const [p1, p2] = [profile.id, data.otherUserId].sort()

    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select('id, last_message_at')
      .eq('participant_one', p1)
      .eq('participant_two', p2)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)

    if (existing) {
      return {
        id: existing.id,
        last_message_at: existing.last_message_at,
        otherUser: other,
      }
    }

    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({ participant_one: p1, participant_two: p2 })
      .select('id, last_message_at')
      .single()

    if (createError) throw new Error(createError.message)

    return {
      id: created.id,
      last_message_at: created.last_message_at,
      otherUser: other,
    }
  })

async function assertConversationAccess(
  supabase: SupabaseClient,
  profileId: string,
  conversationId: string,
) {
  const { data: convo, error } = await supabase
    .from('conversations')
    .select('id, participant_one, participant_two')
    .eq('id', conversationId)
    .single()

  if (error) throw new Error('Conversation not found.')
  if (
    convo.participant_one !== profileId &&
    convo.participant_two !== profileId
  ) {
    throw new Error("You don't have access to this conversation.")
  }
}

const listDirectMessagesInConversationInput = z.object({
  conversationId: z.uuid(),
})

export interface MessageItem {
  id: string
  content: string
  created_at: string | null
  sender_id: string
  sender: { id: string; full_name: string; avatar_url: string | null } | null
}

export const listMessagesInConversation = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listDirectMessagesInConversationInput)
  .handler(async ({ data, context }): Promise<{ messages: MessageItem[] }> => {
    const { supabase, profile } = context
    await assertConversationAccess(supabase, profile.id, data.conversationId)

    const { data: messages, error } = await supabase
      .from('messages')
      .select(
        `
        id, content, created_at, sender_id,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
      `,
      )
      .eq('conversation_id', data.conversationId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    // best-effort: mark other participant's messages read when thread is opened
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', data.conversationId)
      .neq('sender_id', profile.id)
      .is('read_at', null)

    return {
      messages: (messages ?? []).reverse(),
    }
  })

const sendDirectMessageInput = z.object({
  conversationId: z.uuid(),
  content: z.string().trim().min(1).max(4000),
})

export const sendDirectMessage = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(sendDirectMessageInput)
  .handler(async ({ data, context }): Promise<MessageItem> => {
    const { supabase, profile } = context
    await assertConversationAccess(supabase, profile.id, data.conversationId)

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: data.conversationId,
        sender_id: profile.id,
        content: data.content,
      })
      .select(
        `
        id, content, created_at, sender_id,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
      `,
      )
      .single()

    if (error) throw new Error(error.message)

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', data.conversationId)

    return message
  })

const searchUsersInput = z.object({
  query: z.string().trim().min(1).max(100),
})

interface UserSearchResult {
  id: string
  full_name: string
  email: string
  role: string
  avatar_url: string | null
}

export const searchMessageableUsers = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(searchUsersInput)
  .handler(
    async ({ data, context }): Promise<{ users: UserSearchResult[] }> => {
      const { supabase, profile } = context
      const q = data.query.replace(/[%,]/g, '')

      let query = supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .neq('id', profile.id)
        .eq('status', 'approved')

      // students can only find staff to dm, never other students
      if (profile.role === 'student') {
        query = query.neq('role', 'student')
      }

      const { data: users, error } = await query.limit(8)

      if (error) throw new Error(error.message)

      return { users: users ?? [] }
    },
  )

interface GroupConversationListItem {
  id: string
  name: string
  last_message_at: string | null
  subject: { id: string; name: string; code: string } | null
  preview: string | null
  memberCount: number
}

// non-admins only see groups they actually belong to (group_members row)
export const listGroupConversations = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(
    async ({
      context,
    }): Promise<{ conversations: GroupConversationListItem[] }> => {
      const { supabase, profile } = context

      let query = supabase.from('group_conversations').select(
        `
      id, name, last_message_at,
      subject:subjects!group_conversations_subject_id_fkey(id, name, code),
      group_messages(content, created_at),
      group_members(user_id)
    `,
      )

      if (profile.role !== 'admin') {
        const { data: memberOf, error: memberError } = await supabase
          .from('group_members')
          .select('conversation_id')
          .eq('user_id', profile.id)

        if (memberError) throw new Error(memberError.message)

        const ids = memberOf.map((m) => m.conversation_id)
        if (ids.length === 0) return { conversations: [] }
        query = query.in('id', ids)
      }

      const { data: conversations, error } = await query
        .order('last_message_at', { ascending: false })
        .order('created_at', {
          referencedTable: 'group_messages',
          ascending: false,
        })
        .limit(1, { referencedTable: 'group_messages' })

      if (error) throw new Error(error.message)

      return {
        conversations: (conversations ?? []).map((c) => {
          // nested embed above is already limited to the single latest message
          const last = c.group_messages[0] ?? null
          return {
            id: c.id,
            name: c.name,
            last_message_at: c.last_message_at,
            subject: c.subject,
            preview: last ? truncate(last.content) : null,
            memberCount: c.group_members.length,
          }
        }),
      }
    },
  )

async function assertGroupMembership(
  supabase: SupabaseClient,
  profile: { id: string; role: string },
  conversationId: string,
) {
  if (profile.role === 'admin') return

  const { data: membership, error } = await supabase
    .from('group_members')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', profile.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!membership) throw new Error("You don't have access to this group chat.")
}

const listGroupMessagesInput = z.object({
  conversationId: z.uuid(),
})

export const listGroupMessages = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listGroupMessagesInput)
  .handler(async ({ data, context }): Promise<{ messages: MessageItem[] }> => {
    const { supabase, profile } = context
    await assertGroupMembership(supabase, profile, data.conversationId)

    const { data: messages, error } = await supabase
      .from('group_messages')
      .select(
        `
        id, content, created_at, sender_id,
        sender:profiles!group_messages_sender_id_fkey(id, full_name, avatar_url)
      `,
      )
      .eq('conversation_id', data.conversationId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    return {
      messages: (messages ?? []).reverse(),
    }
  })

const sendGroupMessageInput = z.object({
  conversationId: z.uuid(),
  content: z.string().trim().min(1).max(4000),
})

export const sendGroupMessage = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(sendGroupMessageInput)
  .handler(async ({ data, context }): Promise<MessageItem> => {
    const { supabase, profile } = context
    await assertGroupMembership(supabase, profile, data.conversationId)

    const { data: message, error } = await supabase
      .from('group_messages')
      .insert({
        conversation_id: data.conversationId,
        sender_id: profile.id,
        content: data.content,
      })
      .select(
        `
        id, content, created_at, sender_id,
        sender:profiles!group_messages_sender_id_fkey(id, full_name, avatar_url)
      `,
      )
      .single()

    if (error) throw new Error(error.message)

    await supabase
      .from('group_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', data.conversationId)

    return message
  })

const getGroupMembersInput = z.object({
  conversationId: z.uuid(),
})

export interface GroupMemberItem {
  id: string
  is_admin: boolean | null
  profile: { id: string; full_name: string; email: string; role: string } | null
}

export const getGroupMembers = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(getGroupMembersInput)
  .handler(
    async ({ data, context }): Promise<{ members: GroupMemberItem[] }> => {
      const { supabase, profile } = context
      await assertGroupMembership(supabase, profile, data.conversationId)

      const { data: members, error } = await supabase
        .from('group_members')
        .select(
          `
        id, is_admin,
        profile:profiles!group_members_user_id_fkey(id, full_name, email, role)
      `,
        )
        .eq('conversation_id', data.conversationId)

      if (error) throw new Error(error.message)

      return {
        members: members ?? [],
      }
    },
  )