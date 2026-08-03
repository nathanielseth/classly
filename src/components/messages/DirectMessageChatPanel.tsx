import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, MessageSquare, Send, Users } from 'lucide-react'
import {
  getGroupMembers,
  listGroupMessages,
  listMessagesInConversation,
  sendDirectMessage,
  sendGroupMessage,
} from '@/lib/server/functions/messages'
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate'
import { formatTime, getInitial, roleColor } from './format'
import { MembersPanel } from './MembersPanel'
import type { ActiveThread } from './types'

interface ChatPanelProps {
  thread: ActiveThread
  currentUserId: string
  onBack: () => void
  onMessageSent: () => void
}

export function ChatPanel({ thread, currentUserId, onBack, onMessageSent }: ChatPanelProps) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isGroup = thread.type === 'group'
  const messagesQueryKey = isGroup
    ? (['messages', 'group', thread.id] as const)
    : (['messages', 'direct', thread.id] as const)

  const messagesQuery = useQuery({
    queryKey: messagesQueryKey,
    queryFn: () =>
      isGroup
        ? listGroupMessages({ data: { conversationId: thread.id } })
        : listMessagesInConversation({ data: { conversationId: thread.id } }),
  })

  useRealtimeInvalidate({
    channel: `messages:${thread.type}:${thread.id}`,
    table: isGroup ? 'group_messages' : 'messages',
    filter: `conversation_id=eq.${thread.id}`,
    queryKey: messagesQueryKey,
  })

  const membersQuery = useQuery({
    queryKey: ['messages', 'group-members', thread.id],
    queryFn: () => getGroupMembers({ data: { conversationId: thread.id } }),
    enabled: isGroup,
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      isGroup
        ? sendGroupMessage({ data: { conversationId: thread.id, content } })
        : sendDirectMessage({ data: { conversationId: thread.id, content } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: messagesQueryKey })
      onMessageSent()
      inputRef.current?.focus()
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  const handleSend = () => {
    const content = draft.trim()
    if (!content || sendMutation.isPending) return
    setDraft('')
    sendMutation.mutate(content)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const chatName = isGroup ? thread.name : (thread.otherUser?.full_name ?? '')
  const chatSub = isGroup ? (thread.subjectCode ?? 'Group Chat') : (thread.otherUser?.email ?? '')
  const messages = messagesQuery.data?.messages ?? []
  const members = membersQuery.data?.members ?? []

  return (
    <div className="flex flex-col flex-1 bg-white min-w-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${
            isGroup ? 'bg-purple-500' : 'bg-classly-green'
          }`}
        >
          {isGroup ? getInitial(thread.name) : getInitial(thread.otherUser?.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{chatName}</p>
          <p className="text-xs text-gray-500">{chatSub}</p>
        </div>
        {isGroup && (
          <button
            onClick={() => setShowMembers((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Users size={14} />
            {members.length}
          </button>
        )}
        {!isGroup && thread.otherUser?.role && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[thread.otherUser.role]}`}
          >
            {thread.otherUser.role}
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messagesQuery.isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : messagesQuery.isError ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-red-600">{messagesQuery.error.message}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">
                {isGroup ? `Welcome to ${chatName}!` : `Say hi to ${chatName}`}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-classly-green flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {getInitial(msg.sender?.full_name)}
                    </div>
                  )}
                  <div className="max-w-xs lg:max-w-md">
                    {!isMe && isGroup && (
                      <p className="text-xs text-gray-500 mb-1 ml-1">{msg.sender?.full_name}</p>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-classly-green text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <p className="leading-relaxed wrap-break-word">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {showMembers && isGroup && <MembersPanel members={members} />}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 shrink-0">
        {sendMutation.isError && (
          <p className="text-xs text-red-600 mb-2">{sendMutation.error.message}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 resize-none transition-all"
            style={{ minHeight: '42px', maxHeight: '120px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sendMutation.isPending}
            className="p-2.5 bg-classly-green text-white rounded-xl hover:bg-classly-green/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}