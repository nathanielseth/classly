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
import type { MessageItem } from '@/lib/server/functions/messages'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { formatTime, getInitial, roleColor } from './format'
import { MembersPanel } from './MembersPanel'
import type { ActiveThread } from './types'

interface ChatPanelProps {
  thread: ActiveThread
  currentUserId: string
  onBack: () => void
  onMessageSent: () => void
}

export function ChatPanel({
  thread,
  currentUserId,
  onBack,
  onMessageSent,
}: ChatPanelProps) {
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

  const membersQuery = useQuery({
    queryKey: ['messages', 'group-members', thread.id],
    queryFn: () => getGroupMembers({ data: { conversationId: thread.id } }),
    enabled: isGroup,
  })
  const members = membersQuery.data?.members ?? []

  const resolveSender = (senderId: string): MessageItem['sender'] => {
    if (isGroup) {
      const member = members.find((m) => m.profile?.id === senderId)
      return member?.profile
        ? {
            id: member.profile.id,
            full_name: member.profile.full_name,
            avatar_url: null,
          }
        : null
    }
    return thread.otherUser.id === senderId
      ? {
          id: thread.otherUser.id,
          full_name: thread.otherUser.full_name,
          avatar_url: thread.otherUser.avatar_url,
        }
      : null
  }

  useRealtimeMessages({
    channel: `messages:${thread.type}:${thread.id}`,
    table: isGroup ? 'group_messages' : 'messages',
    conversationId: thread.id,
    queryKey: messagesQueryKey,
    resolveSender,
    currentUserId,
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      isGroup
        ? sendGroupMessage({ data: { conversationId: thread.id, content } })
        : sendDirectMessage({ data: { conversationId: thread.id, content } }),
    onSuccess: (message) => {
      queryClient.setQueryData<{ messages: MessageItem[] }>(
        messagesQueryKey,
        (current) =>
          current ? { messages: [...current.messages, message] } : current,
      )
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

  const chatName = isGroup ? thread.name : thread.otherUser.full_name
  const chatSub = isGroup
    ? (thread.subjectCode ?? 'Group Chat')
    : thread.otherUser.email
  const messages = messagesQuery.data?.messages ?? []

  return (
    <div className="flex flex-col flex-1 bg-card min-w-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-2 hover:bg-muted rounded-lg text-muted-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold shrink-0 ${
            isGroup ? 'bg-chart-4 text-background' : 'bg-primary text-primary-foreground'
          }`}
        >
          {isGroup
            ? getInitial(thread.name)
            : getInitial(thread.otherUser.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{chatName}</p>
          <p className="text-xs text-muted-foreground">{chatSub}</p>
        </div>
        {isGroup && (
          <button
            onClick={() => setShowMembers((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Users size={14} />
            {members.length}
          </button>
        )}
        {!isGroup && thread.otherUser.role && (
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
              <Loader2 size={20} className="animate-spin text-muted-foreground/70" />
            </div>
          ) : messagesQuery.isError ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-destructive">
                {messagesQuery.error.message}
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={28} className="text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground/70">
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
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                      {getInitial(msg.sender?.full_name)}
                    </div>
                  )}
                  <div className="max-w-xs lg:max-w-md">
                    {!isMe && isGroup && (
                      <p className="text-xs text-muted-foreground mb-1 ml-1">
                        {msg.sender?.full_name}
                      </p>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}
                    >
                      <p className="leading-relaxed wrap-break-word">
                        {msg.content}
                      </p>
                      <p
                        className={`text-xs mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}
                      >
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

      <div className="px-4 py-3 border-t border-border shrink-0">
        {sendMutation.isError && (
          <p className="text-xs text-destructive mb-2">
            {sendMutation.error.message}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 resize-none transition-all"
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
            className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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