import { useState, useEffect, useCallback } from 'react'
import { syncService, SyncState, SyncResult } from '../services/syncService'
import { useOnlineStatus } from './useOnlineStatus'
import { usePatientStore } from '../store/patientStore'

export interface UseSyncReturn {
  syncState: SyncState
  isOnline: boolean
  isServerReachable: boolean
  syncNow: () => Promise<SyncResult | null>
  isSyncing: boolean
}

export function useSync(autoSync: boolean = true): UseSyncReturn {
  const { isOnline, isServerReachable } = useOnlineStatus()
  const { getAssessmentById, updateAssessment } = usePatientStore()

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
    failedCount: 0,
    hasConflicts: false,
  })

  // Subscribe to sync state changes
  useEffect(() => {
    const unsubscribe = syncService.subscribe(setSyncState)

    // Get initial state
    syncService.getSyncState().then(setSyncState)

    return unsubscribe
  }, [])

  // Sync function
  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    if (!isServerReachable) {
      return null
    }

    return syncService.syncAll(getAssessmentById, updateAssessment)
  }, [isServerReachable, getAssessmentById, updateAssessment])

  // Auto-sync when coming online
  useEffect(() => {
    if (autoSync && isServerReachable && syncState.pendingCount > 0) {
      syncNow()
    }
  }, [autoSync, isServerReachable, syncState.pendingCount, syncNow])

  return {
    syncState,
    isOnline,
    isServerReachable,
    syncNow,
    isSyncing: syncState.isSyncing,
  }
}
