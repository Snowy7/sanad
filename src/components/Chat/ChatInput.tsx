import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react'
import { Send, Square } from 'lucide-react'
import { cn } from '../../lib/designTokens'

interface ChatInputProps {
  onSend: (message: string) => void
  onCancel?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({
  onSend,
  onCancel,
  isLoading = false,
  disabled = false,
  placeholder = 'Ask a question...',
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled && !isLoading) {
      onSend(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-xl px-3 py-2 text-sm',
            'border border-gray-200 focus:border-primary-300',
            'focus:outline-none focus:ring-2 focus:ring-primary-100',
            'placeholder:text-gray-400',
            'disabled:bg-gray-50 disabled:text-gray-400',
            'max-h-[120px]'
          )}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'p-2 rounded-xl bg-red-100 text-red-600',
              'hover:bg-red-200 transition-colors',
              'flex-shrink-0'
            )}
            title="Cancel"
          >
            <Square className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className={cn(
              'p-2 rounded-xl transition-colors flex-shrink-0',
              input.trim() && !disabled
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="text-xs text-gray-400 mt-1 px-1">
        Press Enter to send, Shift+Enter for new line
      </div>
    </form>
  )
}
