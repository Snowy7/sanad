import { useState, useCallback, useEffect } from 'react'
import { lmStudioService } from '../services/lmStudioService'
import { useSettingsStore } from '../store/settingsStore'
import { VLMAnalysisResult } from '../types'

interface UseLMStudioAnalysisReturn {
  analyze: (file: File) => Promise<{ vlmResult: VLMAnalysisResult; rawResponse: string } | null>
  isLoading: boolean
  error: string | null
  isAvailable: boolean
  connectionStatus: 'unknown' | 'checking' | 'connected' | 'disconnected' | 'error'
  checkConnection: () => Promise<boolean>
}

export function useLMStudioAnalysis(): UseLMStudioAnalysisReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    lmStudioConfig,
    lmStudioConnectionStatus,
    setLMStudioConnectionStatus,
  } = useSettingsStore()

  // Update service config when settings change
  useEffect(() => {
    lmStudioService.setConfig(lmStudioConfig)
  }, [lmStudioConfig])

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setLMStudioConnectionStatus('checking')

    try {
      const result = await lmStudioService.checkConnection()

      if (result.connected) {
        setLMStudioConnectionStatus('connected')
        return true
      } else {
        setLMStudioConnectionStatus('disconnected', result.error)
        return false
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Connection check failed'
      setLMStudioConnectionStatus('error', message)
      return false
    }
  }, [setLMStudioConnectionStatus])

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result) // Already includes data:image/...;base64, prefix
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const analyze = useCallback(
    async (file: File): Promise<{ vlmResult: VLMAnalysisResult; rawResponse: string } | null> => {
      setIsLoading(true)
      setError(null)

      try {
        // Check connection first if status is unknown
        if (lmStudioConnectionStatus === 'unknown') {
          const connected = await checkConnection()
          if (!connected) {
            throw new Error('LM Studio server is not available')
          }
        } else if (lmStudioConnectionStatus !== 'connected') {
          throw new Error('LM Studio server is not connected')
        }

        // Convert file to base64
        const imageBase64 = await fileToBase64(file)

        // Analyze with LM Studio
        const { result, rawResponse } = await lmStudioService.analyzeXray(imageBase64)

        return { vlmResult: result, rawResponse }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Analysis failed'
        setError(message)

        // Update connection status if it seems like a connection error
        if (message.includes('timeout') || message.includes('network') || message.includes('fetch')) {
          setLMStudioConnectionStatus('disconnected', message)
        }

        return null
      } finally {
        setIsLoading(false)
      }
    },
    [lmStudioConnectionStatus, checkConnection, setLMStudioConnectionStatus]
  )

  const isAvailable = lmStudioConnectionStatus === 'connected'

  return {
    analyze,
    isLoading,
    error,
    isAvailable,
    connectionStatus: lmStudioConnectionStatus,
    checkConnection,
  }
}
