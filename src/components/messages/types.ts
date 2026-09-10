import type {
  listDirectMessages,
  listGroupConversations,
  listMessagesInConversation,
} from '@/lib/server/functions/messages'

export type DirectConversation = Awaited<
  ReturnType<typeof listDirectMessages>
>['conversations'][number]

export type GroupConversation = Awaited<
  ReturnType<typeof listGroupConversations>
>['conversations'][number]

export type ChatMessage = Awaited<
  ReturnType<typeof listMessagesInConversation>
>['messages'][number]

// carries the type alongside the id so query keys and member-panel decisions dont need to re-derive whether this is a dm or gc
export type ActiveThread =
  | { type: 'dm'; id: string; otherUser: DirectConversation['otherUser'] }
  | { type: 'group'; id: string; name: string; subjectCode: string | null }