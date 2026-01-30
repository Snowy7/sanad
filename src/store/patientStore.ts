import { create } from 'zustand'
import { firebaseService } from '../lib/firebase'
import type {
  Assessment,
  TriageScore,
  ImagingRequest,
} from '../types'

interface PatientState {
  assessments: Assessment[]
  isLoading: boolean
  error: string | null
  isInitialized: boolean

  // Actions
  initialize: () => void
  addAssessment: (assessment: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateAssessment: (id: string, data: Partial<Assessment>) => Promise<void>
  deleteAssessment: (id: string) => Promise<void>
  getAssessmentById: (id: string) => Assessment | undefined
  updateTriagePriority: (assessmentId: string, triageScore: TriageScore) => Promise<void>
  updateImagingRequest: (assessmentId: string, imagingRequest: ImagingRequest) => Promise<void>
}

export const usePatientStore = create<PatientState>()((set, get) => ({
  assessments: [],
  isLoading: true,
  error: null,
  isInitialized: false,

  // Initialize and subscribe to real-time updates
  initialize: () => {
    if (get().isInitialized) return

    set({ isInitialized: true })

    // Subscribe to real-time updates from Firebase
    const unsubscribe = firebaseService.subscribeToAssessments((assessments) => {
      set({ assessments, isLoading: false, error: null })
    })

    // Return unsubscribe function for cleanup
    return unsubscribe
  },

  // Add new assessment
  addAssessment: async (assessmentData) => {
    console.log('[STORE] addAssessment called')
    try {
      set({ error: null })
      const now = new Date()

      // Build base assessment
      const newAssessment: Record<string, any> = {
        patientId: assessmentData.patient.id,
        patient: assessmentData.patient,
        vitals: assessmentData.vitals,
        symptoms: assessmentData.symptoms,
        voiceNotes: assessmentData.voiceNotes || [],
        additionalNotes: assessmentData.additionalNotes || '',
        triageScore: assessmentData.triageScore,
        createdAt: now,
        updatedAt: now,
      }

      // Only add optional fields if they have values (Firebase rejects undefined/null)
      if (assessmentData.xrayAnalysis) {
        newAssessment.xrayAnalysis = assessmentData.xrayAnalysis
      }
      if (assessmentData.imagingRequest) {
        newAssessment.imagingRequest = assessmentData.imagingRequest
      }

      console.log('[STORE] Calling Firebase addAssessment...')
      const id = await firebaseService.addAssessment(newAssessment as any)
      console.log('[STORE] Firebase returned ID:', id)
      return id
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add assessment'
      set({ error: message })
      throw error
    }
  },

  // Update assessment
  updateAssessment: async (id, data) => {
    try {
      set({ error: null })
      await firebaseService.updateAssessment(id, data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update assessment'
      set({ error: message })
      throw error
    }
  },

  // Delete assessment
  deleteAssessment: async (id) => {
    try {
      set({ error: null })
      await firebaseService.deleteAssessment(id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete assessment'
      set({ error: message })
      throw error
    }
  },

  // Get assessment by ID (from local state)
  getAssessmentById: (id) => {
    return get().assessments.find((a) => a.id === id)
  },

  // Update triage priority
  updateTriagePriority: async (assessmentId, triageScore) => {
    try {
      set({ error: null })
      await firebaseService.updateTriagePriority(assessmentId, triageScore)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update triage priority'
      set({ error: message })
      throw error
    }
  },

  // Update imaging request
  updateImagingRequest: async (assessmentId, imagingRequest) => {
    try {
      set({ error: null })
      await firebaseService.updateAssessment(assessmentId, { imagingRequest })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update imaging request'
      set({ error: message })
      throw error
    }
  },
}))

// Legacy IndexedDB exports for backward compatibility with X-ray heatmaps
// These are kept for local caching of large binary data
import { openDB, DBSchema, IDBPDatabase } from 'idb'

export type SyncOperation = 'create' | 'update' | 'delete'

export interface SyncQueueItem {
  id: string
  assessmentId: string
  operation: SyncOperation
  data?: Partial<Assessment>
  timestamp: Date
  retryCount: number
  error?: string
}

interface SanadDB extends DBSchema {
  'xray-images': {
    key: string
    value: {
      id: string
      assessmentId: string
      blob: Blob
      createdAt: Date
    }
  }
  'voice-recordings': {
    key: string
    value: {
      id: string
      assessmentId: string
      blob: Blob
      transcript: string
      createdAt: Date
    }
  }
  'xray-heatmaps': {
    key: string
    value: {
      id: string
      assessmentId: string
      pathology: string
      probability: number
      blob: Blob
      createdAt: Date
    }
  }
  'sync-queue': {
    key: string
    value: SyncQueueItem
    indexes: { 'by-assessment': string }
  }
}

let db: IDBPDatabase<SanadDB> | null = null

export async function getDB(): Promise<IDBPDatabase<SanadDB>> {
  if (db) return db

  db = await openDB<SanadDB>('sanad-db', 2, {
    upgrade(database, oldVersion) {
      if (!database.objectStoreNames.contains('xray-images')) {
        database.createObjectStore('xray-images', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('voice-recordings')) {
        database.createObjectStore('voice-recordings', { keyPath: 'id' })
      }
      if (oldVersion < 2) {
        if (!database.objectStoreNames.contains('xray-heatmaps')) {
          database.createObjectStore('xray-heatmaps', { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains('sync-queue')) {
          const syncStore = database.createObjectStore('sync-queue', { keyPath: 'id' })
          syncStore.createIndex('by-assessment', 'assessmentId')
        }
      }
    },
  })

  return db
}

export async function saveXrayImage(
  assessmentId: string,
  blob: Blob
): Promise<string> {
  const db = await getDB()
  const id = crypto.randomUUID()
  await db.put('xray-images', {
    id,
    assessmentId,
    blob,
    createdAt: new Date(),
  })
  return id
}

export async function getXrayImage(id: string): Promise<Blob | null> {
  const db = await getDB()
  const record = await db.get('xray-images', id)
  return record?.blob || null
}

export async function saveHeatmap(
  assessmentId: string,
  pathology: string,
  probability: number,
  blob: Blob
): Promise<string> {
  const db = await getDB()
  const id = crypto.randomUUID()
  await db.put('xray-heatmaps', {
    id,
    assessmentId,
    pathology,
    probability,
    blob,
    createdAt: new Date(),
  })
  return id
}

export async function getHeatmap(id: string): Promise<Blob | null> {
  const db = await getDB()
  const record = await db.get('xray-heatmaps', id)
  return record?.blob || null
}

export async function getHeatmapsForAssessment(assessmentId: string): Promise<{
  pathology: string
  probability: number
  blob: Blob
  id: string
}[]> {
  const db = await getDB()
  const all = await db.getAll('xray-heatmaps')
  return all
    .filter(h => h.assessmentId === assessmentId)
    .map(h => ({
      pathology: h.pathology,
      probability: h.probability,
      blob: h.blob,
      id: h.id,
    }))
}

export async function deleteHeatmapsForAssessment(assessmentId: string): Promise<void> {
  const db = await getDB()
  const all = await db.getAll('xray-heatmaps')
  const toDelete = all.filter(h => h.assessmentId === assessmentId)
  for (const heatmap of toDelete) {
    await db.delete('xray-heatmaps', heatmap.id)
  }
}

// Voice recording functions
export async function getVoiceRecording(id: string): Promise<Blob | null> {
  const db = await getDB()
  const record = await db.get('voice-recordings', id)
  return record?.blob || null
}

// Sync queue functions
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAll('sync-queue')
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<string> {
  const db = await getDB()
  const id = crypto.randomUUID()
  await db.put('sync-queue', { ...item, id })
  return id
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('sync-queue', id)
}

export async function updateSyncQueueItem(
  id: string,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('sync-queue', id)
  if (existing) {
    await db.put('sync-queue', { ...existing, ...updates })
  }
}
