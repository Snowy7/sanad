import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Assessment,
  VoiceNote,
  TriageScore,
  SyncMetadata,
  PersistedHeatmap,
} from '../types'
import { defaultSyncMetadata } from '../types'

interface PatientState {
  assessments: Assessment[]
  addAssessment: (assessment: Omit<Assessment, 'id' | 'patientId' | 'createdAt' | 'updatedAt'>) => string
  updateAssessment: (id: string, data: Partial<Assessment>) => void
  deleteAssessment: (id: string) => void
  getAssessmentById: (id: string) => Assessment | undefined
  updateTriagePriority: (assessmentId: string, triageScore: TriageScore) => void
}

export const usePatientStore = create<PatientState>()(
  persist(
    (set, get) => ({
      assessments: [],

      addAssessment: (assessmentData) => {
        const id = crypto.randomUUID()
        const now = new Date()

        const newAssessment: Assessment = {
          id,
          patientId: assessmentData.patient.id,
          patient: assessmentData.patient,
          vitals: assessmentData.vitals,
          symptoms: assessmentData.symptoms,
          xrayAnalysis: assessmentData.xrayAnalysis,
          voiceNotes: assessmentData.voiceNotes,
          additionalNotes: assessmentData.additionalNotes,
          triageScore: assessmentData.triageScore,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          assessments: [...state.assessments, newAssessment],
        }))

        return id
      },

      updateAssessment: (id, data) => {
        set((state) => ({
          assessments: state.assessments.map((a) =>
            a.id === id
              ? {
                  ...a,
                  ...data,
                  updatedAt: new Date(),
                }
              : a
          ),
        }))
      },

      deleteAssessment: (id) => {
        set((state) => ({
          assessments: state.assessments.filter((a) => a.id !== id),
        }))
      },

      getAssessmentById: (id) => {
        return get().assessments.find((a) => a.id === id)
      },

      updateTriagePriority: (assessmentId, triageScore) => {
        set((state) => ({
          assessments: state.assessments.map((a) =>
            a.id === assessmentId
              ? {
                  ...a,
                  triageScore,
                  updatedAt: new Date(),
                }
              : a
          ),
        }))
      },
    }),
    {
      name: 'sanad-patients',
      version: 1,
      // Custom serialization to handle Date objects
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const data = JSON.parse(str)
          // Restore Date objects
          if (data.state?.assessments) {
            data.state.assessments = data.state.assessments.map((a: Assessment) => ({
              ...a,
              createdAt: new Date(a.createdAt),
              updatedAt: new Date(a.updatedAt),
              patient: {
                ...a.patient,
                createdAt: new Date(a.patient.createdAt),
                updatedAt: new Date(a.patient.updatedAt),
              },
              xrayAnalysis: a.xrayAnalysis
                ? {
                    ...a.xrayAnalysis,
                    analyzedAt: new Date(a.xrayAnalysis.analyzedAt),
                  }
                : null,
              voiceNotes: a.voiceNotes.map((n: VoiceNote) => ({
                ...n,
                createdAt: new Date(n.createdAt),
              })),
              triageScore: a.triageScore
                ? {
                    ...a.triageScore,
                    overriddenAt: a.triageScore.overriddenAt
                      ? new Date(a.triageScore.overriddenAt)
                      : undefined,
                  }
                : null,
            }))
          }
          return data
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          localStorage.removeItem(name)
        },
      },
    }
  )
)

// IndexedDB storage for better offline support with large data
// This can be used for storing audio blobs and X-ray images
import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Sync operation types
export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string;
  assessmentId: string;
  operation: SyncOperation;
  data?: Partial<Assessment>;
  timestamp: Date;
  retryCount: number;
  error?: string;
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
      // Version 1 stores
      if (!database.objectStoreNames.contains('xray-images')) {
        database.createObjectStore('xray-images', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('voice-recordings')) {
        database.createObjectStore('voice-recordings', { keyPath: 'id' })
      }

      // Version 2 stores (sync & heatmaps)
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

export async function saveVoiceRecording(
  assessmentId: string,
  blob: Blob,
  transcript: string
): Promise<string> {
  const db = await getDB()
  const id = crypto.randomUUID()
  await db.put('voice-recordings', {
    id,
    assessmentId,
    blob,
    transcript,
    createdAt: new Date(),
  })
  return id
}

export async function getVoiceRecording(id: string): Promise<Blob | null> {
  const db = await getDB()
  const record = await db.get('voice-recordings', id)
  return record?.blob || null
}

// Heatmap storage functions
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

// Sync queue functions
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<string> {
  const db = await getDB()
  const id = crypto.randomUUID()
  await db.put('sync-queue', {
    ...item,
    id,
  })
  return id
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  const items = await db.getAll('sync-queue')
  return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

export async function getSyncQueueForAssessment(assessmentId: string): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAllFromIndex('sync-queue', 'by-assessment', assessmentId)
}

export async function updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
  const db = await getDB()
  const item = await db.get('sync-queue', id)
  if (item) {
    await db.put('sync-queue', { ...item, ...updates })
  }
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('sync-queue', id)
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('sync-queue')
}
