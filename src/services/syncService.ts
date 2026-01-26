// Sync orchestration service for SANAD
import { api, AssessmentRecord, ApiError } from './api'
import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  addToSyncQueue,
  SyncQueueItem,
  SyncOperation,
} from '../store/patientStore'
import type { Assessment, SyncMetadata, SyncStatus } from '../types'

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  conflicts: string[] // Assessment IDs with conflicts
  errors: Array<{ assessmentId: string; error: string }>
}

export interface SyncState {
  isSyncing: boolean
  lastSyncTime: Date | null
  pendingCount: number
  failedCount: number
  hasConflicts: boolean
}

// Convert local Assessment to PocketBase record format
function assessmentToRecord(assessment: Assessment): Omit<AssessmentRecord, 'id' | 'collectionId' | 'collectionName' | 'created' | 'updated'> {
  return {
    localId: assessment.id,
    patientName: assessment.patient.name,
    patientAge: assessment.patient.age,
    patientGender: assessment.patient.gender,
    chiefComplaint: assessment.patient.chiefComplaint,
    vitals: JSON.stringify(assessment.vitals),
    symptoms: JSON.stringify(assessment.symptoms),
    xrayFindings: assessment.xrayAnalysis ? JSON.stringify(assessment.xrayAnalysis.findings) : null,
    xrayImageId: assessment.xrayAnalysis?.imageId || null,
    voiceNotes: JSON.stringify(assessment.voiceNotes.map(n => ({
      id: n.id,
      transcript: n.transcript,
      createdAt: n.createdAt.toISOString(),
    }))),
    additionalNotes: assessment.additionalNotes,
    triageScore: assessment.triageScore ? JSON.stringify(assessment.triageScore) : null,
    triagePriority: assessment.triageScore?.priority || 'minimal',
    localCreatedAt: assessment.createdAt.toISOString(),
    localUpdatedAt: assessment.updatedAt.toISOString(),
    localVersion: assessment._sync?.localVersion || 1,
  }
}

// Convert PocketBase record to local Assessment updates
function recordToAssessmentSync(record: AssessmentRecord): Partial<Assessment> & { _sync: SyncMetadata } {
  return {
    _sync: {
      syncStatus: 'synced' as SyncStatus,
      lastSyncedAt: new Date(record.updated),
      localVersion: record.localVersion,
      serverVersion: record.localVersion,
      serverId: record.id,
    },
  }
}

class SyncService {
  private isSyncing = false
  private syncListeners: Array<(state: SyncState) => void> = []

  // Subscribe to sync state changes
  subscribe(listener: (state: SyncState) => void): () => void {
    this.syncListeners.push(listener)
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(state: SyncState) {
    this.syncListeners.forEach(listener => listener(state))
  }

  // Get current sync state
  async getSyncState(): Promise<SyncState> {
    const queue = await getSyncQueue()
    const pendingCount = queue.filter(q => q.retryCount < 3).length
    const failedCount = queue.filter(q => q.retryCount >= 3).length

    return {
      isSyncing: this.isSyncing,
      lastSyncTime: null, // TODO: Store in localStorage
      pendingCount,
      failedCount,
      hasConflicts: false, // TODO: Track conflicts
    }
  }

  // Queue an operation for sync
  async queueOperation(
    assessmentId: string,
    operation: SyncOperation,
    data?: Partial<Assessment>
  ): Promise<void> {
    await addToSyncQueue({
      assessmentId,
      operation,
      data,
      timestamp: new Date(),
      retryCount: 0,
    })
  }

  // Process all pending sync operations
  async syncAll(
    getAssessment: (id: string) => Assessment | undefined,
    updateAssessment: (id: string, data: Partial<Assessment>) => void
  ): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, conflicts: [], errors: [] }
    }

    this.isSyncing = true
    this.notifyListeners(await this.getSyncState())

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: [],
      errors: [],
    }

    try {
      const queue = await getSyncQueue()

      for (const item of queue) {
        try {
          await this.processQueueItem(item, getAssessment, updateAssessment)
          await removeSyncQueueItem(item.id)
          result.synced++
        } catch (error) {
          result.failed++

          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          // Check if it's a conflict
          if (error instanceof ApiError && error.status === 409) {
            result.conflicts.push(item.assessmentId)
          } else {
            result.errors.push({
              assessmentId: item.assessmentId,
              error: errorMessage,
            })
          }

          // Update retry count
          await updateSyncQueueItem(item.id, {
            retryCount: item.retryCount + 1,
            error: errorMessage,
          })
        }
      }

      result.success = result.failed === 0
    } finally {
      this.isSyncing = false
      this.notifyListeners(await this.getSyncState())
    }

    return result
  }

  // Process a single queue item
  private async processQueueItem(
    item: SyncQueueItem,
    getAssessment: (id: string) => Assessment | undefined,
    updateAssessment: (id: string, data: Partial<Assessment>) => void
  ): Promise<void> {
    const assessment = getAssessment(item.assessmentId)

    switch (item.operation) {
      case 'create': {
        if (!assessment) return

        const record = assessmentToRecord(assessment)
        const created = await api.createAssessment(record)

        // Update local assessment with server ID
        updateAssessment(item.assessmentId, {
          _sync: {
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            localVersion: assessment._sync?.localVersion || 1,
            serverVersion: created.localVersion,
            serverId: created.id,
          },
        })
        break
      }

      case 'update': {
        if (!assessment || !assessment._sync?.serverId) {
          // If no server ID, treat as create
          if (assessment) {
            const record = assessmentToRecord(assessment)
            const created = await api.createAssessment(record)
            updateAssessment(item.assessmentId, {
              _sync: {
                syncStatus: 'synced',
                lastSyncedAt: new Date(),
                localVersion: assessment._sync?.localVersion || 1,
                serverVersion: created.localVersion,
                serverId: created.id,
              },
            })
          }
          return
        }

        const record = assessmentToRecord(assessment)
        const updated = await api.updateAssessment(assessment._sync.serverId, record)

        updateAssessment(item.assessmentId, {
          _sync: {
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            localVersion: assessment._sync.localVersion,
            serverVersion: updated.localVersion,
            serverId: updated.id,
          },
        })
        break
      }

      case 'delete': {
        if (assessment?._sync?.serverId) {
          await api.deleteAssessment(assessment._sync.serverId)
        }
        break
      }
    }
  }

  // Pull remote changes (for conflict resolution)
  async pullRemoteChanges(
    since: Date,
    updateAssessment: (id: string, data: Partial<Assessment>) => void
  ): Promise<number> {
    const records = await api.getAssessmentsModifiedSince(since)
    let updated = 0

    for (const record of records) {
      const syncUpdate = recordToAssessmentSync(record)
      updateAssessment(record.localId, syncUpdate)
      updated++
    }

    return updated
  }
}

// Export singleton instance
export const syncService = new SyncService()
