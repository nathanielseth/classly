import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, MessageSquare, Plus, Search, Users } from 'lucide-react'
import { searchMessageableUsers } from '@/lib/server/functions/messages'
import { formatTime, getInitial, roleColor } from './format'
import type { ActiveThread, DirectConversation, GroupConversation } from './types'

interface ConversationListProps {
  tab: 'dms' | 'groups'
  onTabChange: (tab: 'dms' | 'groups') => void
  directConversations: Array<DirectConversation>
  groupConversations: Array<GroupConversation>
  loading: boolean
  active: ActiveThread | null
  onSelectDirect: (conversation: DirectConversation) => void
  onSelectGroup: (conversation: GroupConversation) => void
  onStartDirect: (user: { id: string; full_name: string; email: string; role: string }) => void
  collapsedOnMobile: boolean
}

export function ConversationList({
  tab,
  onTabChange,
  directConversations,
  groupConversations,
  loading,
  active,
  onSelectDirect,
  onSelectGroup,
  onStartDirect,
  collapsedOnMobile,
}: ConversationListProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const searchQuery = useQuery({
    queryKey: ['messages', 'user-search', debouncedQuery],
    queryFn: () => searchMessageableUsers({ data: { query: debouncedQuery } }),
    enabled: debouncedQuery.length > 0,
  })

  const searchResults = debouncedQuery ? (searchQuery.data?.users ?? []) : []

  return (
    <div
      className={`flex flex-col border-r border-border bg-card transition-all ${
        collapsedOnMobile ? 'hidden md:flex w-80 shrink-0' : 'flex w-full md:w-80 md:shrink-0'
      }`}
    >
      <div className="flex border-b border-border/60">
        <button
          onClick={() => onTabChange('dms')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === 'dms'
              ? 'text-classly-green border-b-2 border-classly-green'
              : 'text-muted-foreground hover:text-foreground/80'
          }`}
        >
          Direct
        </button>
        <button
          onClick={() => onTabChange('groups')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === 'groups'
              ? 'text-classly-green border-b-2 border-classly-green'
              : 'text-muted-foreground hover:text-foreground/80'
          }`}
        >
          Groups
        </button>
      </div>

      {tab === 'dms' && (
        <div className="p-3 border-b border-border/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Messages
            </span>
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground/70 hover:text-muted-foreground"
              title="New message"
            >
              <Plus size={16} />
            </button>
          </div>
          {showSearch && (
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70"
              />
              <input
                autoFocus
                type="text"
                placeholder="Search people..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-classly-green"
              />
              {(searchResults.length > 0 || searchQuery.isFetching) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  {searchQuery.isFetching ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={16} className="animate-spin text-muted-foreground/70" />
                    </div>
                  ) : (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setShowSearch(false)
                          setQuery('')
                          onStartDirect(user)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0">
                          {getInitial(user.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[user.role]}`}
                        >
                          {user.role}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground/70" />
          </div>
        ) : tab === 'dms' ? (
          directConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageSquare size={28} className="text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Press + to start one</p>
            </div>
          ) : (
            directConversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => onSelectDirect(convo)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary text-left border-b border-border/40 transition-colors ${
                  active?.type === 'dm' && active.id === convo.id
                    ? 'bg-classly-green/5 border-l-2 border-l-classly-green'
                    : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0">
                  {getInitial(convo.otherUser.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">
                      {convo.otherUser.full_name}
                    </p>
                    <span className="text-xs text-muted-foreground/70 ml-2">
                      {formatTime(convo.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {convo.preview ?? 'No messages yet'}
                  </p>
                </div>
              </button>
            ))
          )
        ) : groupConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Users size={28} className="text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No group chats yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Groups are created automatically when a subject is made
            </p>
          </div>
        ) : (
          groupConversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => onSelectGroup(convo)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary text-left border-b border-border/40 transition-colors ${
                active?.type === 'group' && active.id === convo.id
                  ? 'bg-classly-green/5 border-l-2 border-l-classly-green'
                  : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-chart-4 flex items-center justify-center text-background font-semibold text-sm shrink-0">
                {getInitial(convo.subject?.name ?? convo.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">
                    {convo.subject?.name ?? convo.name}
                  </p>
                  <span className="text-xs text-muted-foreground/70 ml-2">
                    {formatTime(convo.last_message_at)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {convo.subject?.code && (
                    <span className="text-chart-4 font-medium mr-1">
                      {convo.subject.code}
                    </span>
                  )}
                  {convo.preview ?? 'No messages yet'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}