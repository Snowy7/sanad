import { useEffect, useRef } from 'react'
import { X, Sparkles, WifiOff } from 'lucide-react'
import { useChatContext } from '../../context/ChatContext'
import { useContextualChat } from '../../hooks/useContextualChat'
import { getQuickSuggestions } from '../../lib/chatPrompts'
import { cn } from '../../lib/designTokens'

interface ChatSidebarProps {
  className?: string
}

export default function ChatSidebar({ className }: ChatSidebarProps) {
  const { isOpen, closeChat, context } = useChatContext()
  const {
    messages,
    isLoading,
    error,
    isConfigured,
    sendMessage,
    clearChat,
  } = useContextualChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const suggestions = getQuickSuggestions(context.page, context.step, !!context.patient)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
        onClick={closeChat}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50',
          'w-full max-w-md',
          'bg-white',
          'flex flex-col',
          'shadow-2xl',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">SANAD AI</h2>
              <p className="text-xs text-gray-500">
                {context.patient?.patient.name || 'Medical Assistant'}
              </p>
            </div>
          </div>
          <button
            onClick={closeChat}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status bar */}
        {!isConfigured && (
          <div className="px-4 py-2 bg-amber-50 flex items-center gap-2 text-xs text-amber-700">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Connect LM Studio in Settings to enable AI</span>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 bg-red-50 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                Ask me anything about triage, vital signs, or clinical decisions.
              </p>

              {/* Quick suggestions */}
              <div className="space-y-2">
                {suggestions.slice(0, 4).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.query || s.text)}
                    disabled={!isConfigured || isLoading}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-sm text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'max-w-[85%]',
                    msg.role === 'user' ? 'ml-auto' : 'mr-auto'
                  )}
                >
                  <div
                    className={cn(
                      'px-3 py-2 rounded-2xl text-sm',
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-1 px-3 py-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement
              if (input.value.trim()) {
                sendMessage(input.value.trim())
                input.value = ''
              }
            }}
            className="flex gap-2"
          >
            <input
              name="message"
              type="text"
              placeholder={isConfigured ? 'Type a message...' : 'LM Studio not configured'}
              disabled={!isConfigured || isLoading}
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="submit"
              disabled={!isConfigured || isLoading}
              className="px-4 py-2.5 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
            >
              Send
            </button>
          </form>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>
    </>
  )
}
