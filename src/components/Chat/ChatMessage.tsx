import { ChatMessage as ChatMessageType } from '../../types'
import { cn } from '../../lib/designTokens'
import { User, Bot } from 'lucide-react'

interface ChatMessageProps {
  message: ChatMessageType
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="px-3 py-2 text-xs text-gray-500 text-center italic">
        {message.content}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-2 px-3 py-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-primary-100' : 'bg-gray-100'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-600" />
        ) : (
          <Bot className="w-4 h-4 text-gray-600" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3 py-2 text-sm',
          isUser
            ? 'bg-primary-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        )}
      >
        {/* Render message with basic markdown support */}
        <div className="whitespace-pre-wrap break-words">
          {formatMessage(message.content)}
        </div>

        {/* Timestamp */}
        <div
          className={cn(
            'text-xs mt-1 opacity-70',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatMessage(content: string): string {
  // Basic formatting - could be enhanced with markdown renderer
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers (display as plain)
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic markers
    .replace(/`(.*?)`/g, '$1')       // Remove code markers
}
