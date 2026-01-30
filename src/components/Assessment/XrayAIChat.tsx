import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, AlertCircle, Copy, Check, MessageSquare, Sparkles } from 'lucide-react'
import { ChatMessage } from '../../types'
import { useXrayChat } from '../../hooks/useXrayChat'

const QUICK_QUESTIONS = [
  'Are there any signs of pneumonia?',
  'Is there pleural effusion?',
  'How does the heart size appear?',
  'Are there any rib fractures?',
  "What's the image quality like?",
  'Should any follow-up imaging be done?',
]

interface XrayAIChatProps {
  imageBase64: string | null
  initialAnalysis?: string
  chatHistory?: ChatMessage[]
  onChatUpdate?: (messages: ChatMessage[]) => void
}

export default function XrayAIChat({
  imageBase64,
  initialAnalysis,
  chatHistory,
  onChatUpdate,
}: XrayAIChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, isLoading, error, initializeWithAnalysis } = useXrayChat(imageBase64)

  // Initialize with existing analysis or history
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      // History is managed externally, we just display it
      return
    }
    if (initialAnalysis && messages.length === 0) {
      initializeWithAnalysis(initialAnalysis)
    }
  }, [initialAnalysis, chatHistory, messages.length, initializeWithAnalysis])

  // Notify parent of chat updates
  useEffect(() => {
    if (onChatUpdate && messages.length > 0) {
      onChatUpdate(messages)
    }
  }, [messages, onChatUpdate])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatHistory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const question = inputValue.trim()
    setInputValue('')
    await sendMessage(question)
  }

  const handleQuickQuestion = async (question: string) => {
    if (isLoading) return
    await sendMessage(question)
  }

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }

  // Use external chat history if provided, otherwise use internal messages
  const displayMessages = chatHistory && chatHistory.length > 0 ? chatHistory : messages

  return (
    <div className="card mt-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary-600" />
        <h3 className="font-semibold text-gray-900">AI Analysis Chat</h3>
        <span className="flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
          <Sparkles className="w-3 h-3" />
          Interactive
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-3 max-h-96 overflow-y-auto mb-4 pr-2">
        {displayMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500">AI Assistant</span>
                  <button
                    onClick={() => handleCopy(message.content, message.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
              <span className="text-sm text-gray-600">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Quick Questions */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((question) => (
            <button
              key={question}
              onClick={() => handleQuickQuestion(question)}
              disabled={isLoading || !imageBase64}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question about the X-ray..."
          disabled={isLoading || !imageBase64}
          className="flex-1 input"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim() || !imageBase64}
          className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>

      {!imageBase64 && (
        <p className="text-xs text-amber-600 mt-2">
          Upload an X-ray image to enable chat.
        </p>
      )}
    </div>
  )
}
