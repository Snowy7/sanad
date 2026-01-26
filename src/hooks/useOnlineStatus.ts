import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

interface OnlineStatus {
  isOnline: boolean
  isServerReachable: boolean
  lastChecked: Date | null
}

export function useOnlineStatus(checkInterval: number = 30000) {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: navigator.onLine,
    isServerReachable: false,
    lastChecked: null,
  })

  const checkServerConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isServerReachable: false,
        lastChecked: new Date(),
      }))
      return
    }

    try {
      await api.health()
      setStatus({
        isOnline: true,
        isServerReachable: true,
        lastChecked: new Date(),
      })
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        isServerReachable: false,
        lastChecked: new Date(),
      }))
    }
  }, [])

  useEffect(() => {
    // Browser online/offline events
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }))
      checkServerConnection()
    }

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isServerReachable: false,
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    checkServerConnection()

    // Periodic check
    const interval = setInterval(checkServerConnection, checkInterval)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [checkServerConnection, checkInterval])

  return {
    ...status,
    checkServerConnection,
  }
}
