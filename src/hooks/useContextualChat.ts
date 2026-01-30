import { useCallback, useRef } from 'react'
import { useChatContext } from '../context/ChatContext'
import { useSettingsStore } from '../store/settingsStore'
import { lmStudioService, LMStudioMessage } from '../services/lmStudioService'
import { getSystemPrompt } from '../lib/chatPrompts'

interface UseContextualChatOptions {
  onError?: (error: string) => void
}

export function useContextualChat(options?: UseContextualChatOptions) {
  const {
    messages,
    context,
    isLoading,
    error,
    addMessage,
    setLoading,
    setError,
    clearMessages,
  } = useChatContext()

  const { lmStudioConfig, lmStudioConnectionStatus } = useSettingsStore()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Check if LM Studio is configured (has a server URL)
  const isConfigured = Boolean(lmStudioConfig?.serverUrl)
  const isConnected = lmStudioConnectionStatus === 'connected'

  // Send a message and get AI response
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return
      if (!isConfigured) {
        setError('LM Studio is not configured. Please configure it in Settings.')
        return
      }

      // Add user message
      addMessage({
        role: 'user',
        content: userMessage,
      })

      setLoading(true)
      setError(null)

      try {
        // Configure the service
        lmStudioService.setConfig(lmStudioConfig)

        // Build system prompt with context
        const systemPrompt = getSystemPrompt(
          context.page,
          context.step,
          context.patient
        )

        // Build message history for LM Studio
        const lmMessages: LMStudioMessage[] = [
          { role: 'system', content: systemPrompt },
        ]

        // Add previous messages (last 10 for context window management)
        const recentMessages = messages.slice(-10)
        for (const msg of recentMessages) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            lmMessages.push({
              role: msg.role,
              content: msg.content,
            })
          }
        }

        // Add the new user message
        lmMessages.push({
          role: 'user',
          content: userMessage,
        })

        // If there's an X-ray image in context, include it with the first message
        if (context.xrayImage && lmMessages.length > 1) {
          const firstUserMsgIndex = lmMessages.findIndex((m) => m.role === 'user')
          if (firstUserMsgIndex !== -1) {
            // Modify to include image
            const originalContent = lmMessages[firstUserMsgIndex].content
            lmMessages[firstUserMsgIndex] = {
              role: 'user',
              content: [
                { type: 'text', text: typeof originalContent === 'string' ? originalContent : 'Analyze this image.' },
                { type: 'image_url', image_url: { url: context.xrayImage } },
              ],
            }
          }
        }

        // Create abort controller for this request
        abortControllerRef.current = new AbortController()

        // Send request to LM Studio
        const response = await fetch(`${lmStudioConfig.serverUrl.replace(/\/$/, '')}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(lmStudioConfig.apiKey && { Authorization: `Bearer ${lmStudioConfig.apiKey}` }),
          },
          body: JSON.stringify({
            model: lmStudioConfig.modelName,
            messages: lmMessages,
            max_tokens: lmStudioConfig.maxTokens || 1024,
            temperature: lmStudioConfig.temperature || 0.7,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`LM Studio error (${response.status}): ${errorText}`)
        }

        const data = await response.json()
        const assistantMessage = data.choices?.[0]?.message?.content || ''

        // Add assistant response
        addMessage({
          role: 'assistant',
          content: assistantMessage,
        })
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // Request was cancelled
            return
          }
          const errorMessage = err.message
          setError(errorMessage)
          options?.onError?.(errorMessage)
        } else {
          setError('An unexpected error occurred')
          options?.onError?.('An unexpected error occurred')
        }
      } finally {
        setLoading(false)
        abortControllerRef.current = null
      }
    },
    [
      isConfigured,
      lmStudioConfig,
      messages,
      context,
      addMessage,
      setLoading,
      setError,
      options,
    ]
  )

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setLoading(false)
    }
  }, [setLoading])

  // Clear chat history
  const clearChat = useCallback(() => {
    clearMessages()
    setError(null)
  }, [clearMessages, setError])

  return {
    messages,
    isLoading,
    error,
    isConfigured,
    isConnected,
    sendMessage,
    cancelRequest,
    clearChat,
  }
}
