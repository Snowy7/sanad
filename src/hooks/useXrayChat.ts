import { useState, useCallback, useEffect } from 'react'
import { lmStudioService } from '../services/lmStudioService'
import { useSettingsStore } from '../store/settingsStore'
import { ChatMessage } from '../types'

interface UseXrayChatReturn {
  messages: ChatMessage[]
  sendMessage: (question: string) => Promise<void>
  isLoading: boolean
  error: string | null
  clearChat: () => void
  initializeWithAnalysis: (analysisResponse: string) => void
}

export function useXrayChat(imageBase64: string | null): UseXrayChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { lmStudioConfig } = useSettingsStore()

  // Update service config when settings change
  useEffect(() => {
    lmStudioService.setConfig(lmStudioConfig)
  }, [lmStudioConfig])

  const initializeWithAnalysis = useCallback((analysisResponse: string) => {
    const initialMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: analysisResponse,
      timestamp: new Date(),
    }
    setMessages([initialMessage])
  }, [])

  const sendMessage = useCallback(
    async (question: string) => {
      if (!imageBase64) {
        setError('No image available for analysis')
        return
      }

      if (!question.trim()) {
        return
      }

      setIsLoading(true)
      setError(null)

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])

      try {
        // Send to LM Studio with conversation history
        const response = await lmStudioService.askFollowUp(
          imageBase64,
          messages,
          question
        )

        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to get response'
        setError(message)

        // Remove the user message if the request failed
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
      } finally {
        setIsLoading(false)
      }
    },
    [imageBase64, messages]
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    clearChat,
    initializeWithAnalysis,
  }
}
