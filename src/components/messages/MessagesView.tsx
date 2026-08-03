import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'
import {
  getOrCreateDirectConversation,
  listDirectMessages,
  listGroupConversations,
} from '@/lib/server/functions/messages'
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate'
import { ChatPanel } from './DirectMessageChatPanel'
import { ConversationList } from './ConversationList'
import type { ActiveThread, DirectConversation, GroupConversation } from './types'

interface MessagesViewProps {
  currentUserId: string
  openDmUserId?: string
}

export function MessagesView({ currentUserId, openDmUserId }: MessagesViewProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'dms' | 'groups'>('dms')
  const [active, setActive] = useState<ActiveThread | null>(null)

  const directQueryKey = ['messages', 'direct-conversations'] as const
  const groupQueryKey = ['messages', 'group-conversations'] as const

  const directQuery = useQuery({
    queryKey: directQueryKey,
    queryFn: () => listDirectMessages(),
  })

  const groupQuery = useQuery({
    queryKey: groupQueryKey,
    queryFn: () => listGroupConversations(),
  })

  // since gcs cant be filtered to "mine" at realtime layer, we subscribe unfiltered and rely on access‑controlled list queries to handle filtering on refetch
  useRealtimeInvalidate({
    channel: `conversations:${currentUserId}`,
    table: 'conversations',
    queryKey: directQueryKey,
  })
  useRealtimeInvalidate({
    channel: `messages:list:${currentUserId}`,
    table: 'messages',
    queryKey: directQueryKey,
  })
  useRealtimeInvalidate({
    channel: `group-conversations:${currentUserId}`,
    table: 'group_conversations',
    queryKey: groupQueryKey,
  })
  useRealtimeInvalidate({
    channel: `group-messages:list:${currentUserId}`,
    table: 'group_messages',
    queryKey: groupQueryKey,
  })

  const startDirectMutation = useMutation({
    mutationFn: (otherUserId: string) =>
      getOrCreateDirectConversation({ data: { otherUserId } }),
    onSuccess: async (convo) => {
      setActive({ type: 'dm', id: convo.id, otherUser: convo.otherUser })
      setTab('dms')
      await queryClient.invalidateQueries({ queryKey: directQueryKey })
    },
  })

  // only fire once per landing on the page with a dmuserid
  const consumedDeepLink = useRef(false)
  useEffect(() => {
    if (!openDmUserId || consumedDeepLink.current) return
    consumedDeepLink.current = true
    startDirectMutation.mutate(openDmUserId)
  }, [openDmUserId])

  const handleSelectDirect = (convo: DirectConversation) => {
    setActive({ type: 'dm', id: convo.id, otherUser: convo.otherUser })
  }

  const handleSelectGroup = (convo: GroupConversation) => {
    setActive({
      type: 'group',
      id: convo.id,
      name: convo.subject?.name ?? convo.name,
      subjectCode: convo.subject?.code ?? null,
    })
  }

  const handleTabChange = (next: 'dms' | 'groups') => {
    setTab(next)
    setActive(null)
  }

  // kept as an immediate fallback for the sender's own client
  const refreshLists = () => {
    void queryClient.invalidateQueries({ queryKey: directQueryKey })
    void queryClient.invalidateQueries({ queryKey: groupQueryKey })
  }

  const loading = tab === 'dms' ? directQuery.isPending : groupQuery.isPending

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 64px)' }}>
      <ConversationList
        tab={tab}
        onTabChange={handleTabChange}
        directConversations={directQuery.data?.conversations ?? []}
        groupConversations={groupQuery.data?.conversations ?? []}
        loading={loading}
        active={active}
        onSelectDirect={handleSelectDirect}
        onSelectGroup={handleSelectGroup}
        onStartDirect={(user) => startDirectMutation.mutate(user.id)}
        collapsedOnMobile={active !== null}
      />

      {active ? (
        <ChatPanel
          key={`${active.type}:${active.id}`}
          thread={active}
          currentUserId={currentUserId}
          onBack={() => setActive(null)}
          onMessageSent={refreshLists}
        />
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50 text-center">
          <MessageSquare size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {startDirectMutation.isPending
              ? 'Opening conversation...'
              : 'Select a conversation'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {tab === 'dms'
              ? 'or press + to start a new one'
              : "Groups appear here when you're enrolled in a subject"}
          </p>
        </div>
      )}
    </div>
  )
}