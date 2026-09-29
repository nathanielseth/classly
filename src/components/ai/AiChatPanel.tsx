import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sparkles, Send } from 'lucide-react'
import { sendChatMessage } from '@/lib/server/functions/ai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatPanel({ userRole: _userRole }: { userRole: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! How can I help you with your coursework today?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const chatMutation = useMutation({
    mutationFn: async (nextMessages: ChatMessage[]) => {
      const { stream } = await sendChatMessage({
        data: {
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      })

      // placeholder bubble that fills in as tokens arrive
      const assistantTimestamp = new Date()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', timestamp: assistantTimestamp },
      ])

      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullContent += decoder.decode(value, { stream: true })
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = {
              role: 'assistant',
              content: fullContent,
              timestamp: assistantTimestamp,
            }
            return next
          })
        }
      } catch (err) {
        if (!fullContent) {
          setMessages((prev) => prev.slice(0, -1))
        }
        throw err
      }

      return fullContent
    },
  })

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    chatMutation.mutate(nextMessages)
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-150">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <ChatBubble key={index} message={message} />
        ))}

        {chatMutation.isPending &&
          messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-classly-green/10 flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-classly-green" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </div>
            </div>
          )}
        <div ref={messagesEndRef} />
      </div>

      {chatMutation.isError && (
        <div className="px-6 py-3 bg-destructive/8 border-t border-destructive/30">
          <p className="text-sm text-destructive">{chatMutation.error.message}</p>
        </div>
      )}

      <div className="border-t border-border p-4 bg-secondary">
        <div className="flex items-end gap-2">
          <div className="flex-1 flex items-center bg-card border border-border rounded-xl focus-within:border-classly-green focus-within:ring-2 focus-within:ring-classly-green/20">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask me anything about your coursework..."
              className="flex-1 px-4 py-3 bg-transparent focus:outline-none"
              disabled={chatMutation.isPending}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={chatMutation.isPending || !input.trim()}
            className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground/70 transition-all"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isAssistant ? 'bg-classly-green/10' : 'bg-info'
        }`}
      >
        {isAssistant ? (
          <Sparkles size={16} className="text-classly-green" />
        ) : (
          <span className="text-info-foreground text-sm font-medium">You</span>
        )}
      </div>

      <div className={`flex-1 ${isAssistant ? '' : 'flex justify-end'}`}>
        <div
          className={`inline-block max-w-[80%] rounded-2xl px-4 py-3 ${
            isAssistant
              ? 'bg-muted text-foreground rounded-tl-sm'
              : 'bg-primary text-primary-foreground rounded-tr-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <span
            className={`text-[10px] mt-1.5 block ${
              isAssistant ? 'text-muted-foreground/70' : 'text-primary-foreground/70'
            }`}
          >
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}