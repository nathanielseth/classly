import { useEffect, useRef } from 'react'
import { useQueryClient  } from '@tanstack/react-query'
import type {QueryKey} from '@tanstack/react-query';
import { getBrowserSupabase } from '@/lib/browser-supabase'
import type { MessageItem } from '@/lib/server/functions/messages'

interface RealtimeMessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

interface UseRealtimeMessagesOptions {
  channel: string
  table: 'messages' | 'group_messages'
  conversationId: string
  queryKey: QueryKey
  resolveSender: (senderId: string) => MessageItem['sender']
  currentUserId: string
}

// rls‑gated postgres changes are safe to append directly in threads, avoiding full refetch where low latency matters
export function useRealtimeMessages({
  channel,
  table,
  conversationId,
  queryKey,
  resolveSender,
  currentUserId,
}: UseRealtimeMessagesOptions) {
  const queryClient = useQueryClient()
  const resolveSenderRef = useRef(resolveSender)
  resolveSenderRef.current = resolveSender

  useEffect(() => {
    const supabase = getBrowserSupabase()
    const sub = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as RealtimeMessageRow
          if (row.sender_id === currentUserId) return

          const message: MessageItem = {
            id: row.id,
            content: row.content,
            created_at: row.created_at,
            sender_id: row.sender_id,
            sender: resolveSenderRef.current(row.sender_id),
          }

          queryClient.setQueryData<{ messages: MessageItem[] }>(
            queryKey,
            (current) => {
              if (!current) return current
              if (current.messages.some((m) => m.id === message.id)) {
                return current
              }
              return { messages: [...current.messages, message] }
            },
          )
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(sub)
    }
  }, [channel, table, conversationId, currentUserId])
}