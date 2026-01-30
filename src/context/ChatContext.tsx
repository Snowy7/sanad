import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { Assessment, ChatMessage } from '../types'

export type ChatPage = 'home' | 'assessment' | 'queue' | 'patient-detail' | 'imaging' | 'settings'
export type AssessmentStep = 'patient-info' | 'vitals' | 'symptoms' | 'imaging-decision' | 'xray' | 'voice' | 'review'

export interface ChatContextData {
  page: ChatPage
  patient?: Assessment
  step?: AssessmentStep
  xrayImage?: string
}

interface ChatState {
  isOpen: boolean
  messages: ChatMessage[]
  context: ChatContextData
  isLoading: boolean
  error: string | null
}

interface ChatContextType extends ChatState {
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  setContext: (context: Partial<ChatContextData>) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const ChatContext = createContext<ChatContextType | null>(null)

const STORAGE_KEY = 'sanad-chat-state'

interface StoredState {
  messages: ChatMessage[]
  context: ChatContextData
}

function loadStoredState(): StoredState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Restore Date objects
      parsed.messages = parsed.messages.map((msg: ChatMessage) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))
      return parsed
    }
  } catch (e) {
    console.error('Failed to load chat state:', e)
  }
  return null
}

function saveState(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save chat state:', e)
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const storedState = loadStoredState()

  const [state, setState] = useState<ChatState>({
    isOpen: false,
    messages: storedState?.messages || [],
    context: storedState?.context || { page: 'home' },
    isLoading: false,
    error: null,
  })

  // Persist messages and context
  useEffect(() => {
    saveState({
      messages: state.messages,
      context: state.context,
    })
  }, [state.messages, state.context])

  const openChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }))
  }, [])

  const closeChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const toggleChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }))
  }, [])

  const setContext = useCallback((context: Partial<ChatContextData>) => {
    setState((prev) => ({
      ...prev,
      context: { ...prev.context, ...context },
    }))
  }, [])

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    }
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }))
  }, [])

  const clearMessages = useCallback(() => {
    setState((prev) => ({ ...prev, messages: [] }))
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }))
  }, [])

  return (
    <ChatContext.Provider
      value={{
        ...state,
        openChat,
        closeChat,
        toggleChat,
        setContext,
        addMessage,
        clearMessages,
        setLoading,
        setError,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
