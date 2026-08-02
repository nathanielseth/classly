import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sparkles, Send } from 'lucide-react'
import { sendChatMessage } from '@/lib/server/functions/ai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SYSTEM_PROMPTS: Record<string, string> = {
  instructor:
    'You are an intelligent teaching assistant helping university instructors prepare lessons, create assessments, explain concepts clearly, and manage their classes. Provide practical, educator-focused responses.',
  admin:
    'You are an intelligent system assistant helping a university LMS administrator manage users, subjects, and platform operations. Provide clear, administrative guidance.',
  student:
    'You are an intelligent academic assistant helping students with their coursework. Provide clear, accurate, and helpful responses. Be concise but thorough.',
}

export function ChatPanel({ userRole }: { userRole: string }) {
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
    mutationFn: (nextMessages: ChatMessage[]) => {
      const systemPrompt = SYSTEM_PROMPTS[userRole] ?? SYSTEM_PROMPTS.student
      return sendChatMessage({
        data: {
          messages: [
            { role: 'system' as const, content: systemPrompt },
            ...nextMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
        },
      })
    },
    onSuccess: (result) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.content, timestamp: new Date() },
      ])
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-150">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <ChatBubble key={index} message={message} />
        ))}

        {chatMutation.isPending && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-classly-green/10 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-classly-green" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {chatMutation.isError && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{chatMutation.error.message}</p>
        </div>
      )}

      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-end gap-2">
          <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-xl focus-within:border-classly-green focus-within:ring-2 focus-within:ring-classly-green/20">
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
            className="p-2.5 bg-classly-green text-white rounded-xl hover:bg-classly-green/90 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
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
          isAssistant ? 'bg-classly-green/10' : 'bg-blue-500'
        }`}
      >
        {isAssistant ? (
          <Sparkles size={16} className="text-classly-green" />
        ) : (
          <span className="text-white text-sm font-medium">You</span>
        )}
      </div>

      <div className={`flex-1 ${isAssistant ? '' : 'flex justify-end'}`}>
        <div
          className={`inline-block max-w-[80%] rounded-2xl px-4 py-3 ${
            isAssistant
              ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
              : 'bg-classly-green text-white rounded-tr-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <span
            className={`text-[10px] mt-1.5 block ${
              isAssistant ? 'text-gray-400' : 'text-white/70'
            }`}
          >
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}