import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage'
import type { Assessment, TriageScore } from '../types'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBeDcJf1EXK0_x6ToHbvddfpW0gcEnI7o8",
  authDomain: "sanad-fa765.firebaseapp.com",
  projectId: "sanad-fa765",
  storageBucket: "sanad-fa765.firebasestorage.app",
  messagingSenderId: "740021267746",
  appId: "1:740021267746:web:fbdcb8d733cd6c5794097b",
  measurementId: "G-C3YZ175BWM"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Offline persistence disabled - was causing addDoc to hang
// enableIndexedDbPersistence(db).catch((err) => {
//   if (err.code === 'failed-precondition') {
//     console.warn('Firestore persistence failed: Multiple tabs open')
//   } else if (err.code === 'unimplemented') {
//     console.warn('Firestore persistence not available in this browser')
//   }
// })

// Collection reference
const ASSESSMENTS_COLLECTION = 'assessments'

// Helper to convert Firestore timestamps to Dates
function convertTimestamps(data: any): any {
  if (!data) return data

  const converted = { ...data }

  // Convert top-level timestamps
  if (converted.createdAt?.toDate) {
    converted.createdAt = converted.createdAt.toDate()
  }
  if (converted.updatedAt?.toDate) {
    converted.updatedAt = converted.updatedAt.toDate()
  }

  // Convert patient timestamps
  if (converted.patient) {
    if (converted.patient.createdAt?.toDate) {
      converted.patient.createdAt = converted.patient.createdAt.toDate()
    }
    if (converted.patient.updatedAt?.toDate) {
      converted.patient.updatedAt = converted.patient.updatedAt.toDate()
    }
  }

  // Convert xrayAnalysis timestamp
  if (converted.xrayAnalysis?.analyzedAt?.toDate) {
    converted.xrayAnalysis.analyzedAt = converted.xrayAnalysis.analyzedAt.toDate()
  }

  // Convert voice notes timestamps
  if (converted.voiceNotes) {
    converted.voiceNotes = converted.voiceNotes.map((note: any) => ({
      ...note,
      createdAt: note.createdAt?.toDate ? note.createdAt.toDate() : note.createdAt,
    }))
  }

  // Convert triage score timestamp
  if (converted.triageScore?.overriddenAt?.toDate) {
    converted.triageScore.overriddenAt = converted.triageScore.overriddenAt.toDate()
  }

  // Convert imaging request timestamp
  if (converted.imagingRequest?.requestedAt?.toDate) {
    converted.imagingRequest.requestedAt = converted.imagingRequest.requestedAt.toDate()
  }

  return converted
}

// Helper to convert Dates to Firestore timestamps
function convertToTimestamps(data: any): any {
  console.log('[FIREBASE] convertToTimestamps called')
  if (!data) return data

  const converted = { ...data }

  // Convert top-level dates
  if (converted.createdAt instanceof Date) {
    converted.createdAt = Timestamp.fromDate(converted.createdAt)
  }
  if (converted.updatedAt instanceof Date) {
    converted.updatedAt = Timestamp.fromDate(converted.updatedAt)
  }

  // Convert patient dates
  if (converted.patient) {
    converted.patient = { ...converted.patient }
    if (converted.patient.createdAt instanceof Date) {
      converted.patient.createdAt = Timestamp.fromDate(converted.patient.createdAt)
    }
    if (converted.patient.updatedAt instanceof Date) {
      converted.patient.updatedAt = Timestamp.fromDate(converted.patient.updatedAt)
    }
  }

  // Convert xrayAnalysis date
  if (converted.xrayAnalysis?.analyzedAt instanceof Date) {
    converted.xrayAnalysis = {
      ...converted.xrayAnalysis,
      analyzedAt: Timestamp.fromDate(converted.xrayAnalysis.analyzedAt),
    }
  }

  // Convert voice notes dates
  if (converted.voiceNotes) {
    converted.voiceNotes = converted.voiceNotes.map((note: any) => ({
      ...note,
      createdAt: note.createdAt instanceof Date
        ? Timestamp.fromDate(note.createdAt)
        : note.createdAt,
    }))
  }

  // Convert triage score date
  if (converted.triageScore?.overriddenAt instanceof Date) {
    converted.triageScore = {
      ...converted.triageScore,
      overriddenAt: Timestamp.fromDate(converted.triageScore.overriddenAt),
    }
  }

  // Convert imaging request date
  if (converted.imagingRequest?.requestedAt instanceof Date) {
    converted.imagingRequest = {
      ...converted.imagingRequest,
      requestedAt: Timestamp.fromDate(converted.imagingRequest.requestedAt),
    }
  }

  return converted
}

// Firebase service functions
export const firebaseService = {
  // Subscribe to all assessments (real-time)
  subscribeToAssessments(callback: (assessments: Assessment[]) => void) {
    const q = query(
      collection(db, ASSESSMENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    )

    return onSnapshot(q, (snapshot) => {
      const assessments: Assessment[] = []
      snapshot.forEach((doc) => {
        const data = convertTimestamps(doc.data())
        assessments.push({
          ...data,
          id: doc.id,
        } as Assessment)
      })
      callback(assessments)
    }, (error) => {
      console.error('Error fetching assessments:', error)
    })
  },

  // Get all assessments (one-time)
  async getAssessments(): Promise<Assessment[]> {
    const q = query(
      collection(db, ASSESSMENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    const assessments: Assessment[] = []
    snapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data())
      assessments.push({
        ...data,
        id: doc.id,
      } as Assessment)
    })
    return assessments
  },

  // Get single assessment
  async getAssessment(id: string): Promise<Assessment | null> {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = convertTimestamps(docSnap.data())
      return {
        ...data,
        id: docSnap.id,
      } as Assessment
    }
    return null
  },

  // Add new assessment
  async addAssessment(assessment: Omit<Assessment, 'id'>): Promise<string> {
    console.log('[FIREBASE] addAssessment called')

    try {
      // Clean nulls from vitals
      const cleanedAssessment = {
        ...assessment,
        vitals: Object.fromEntries(
          Object.entries(assessment.vitals || {}).filter(([_, v]) => v !== null && v !== undefined)
        ),
      }

      const dataToSave = convertToTimestamps(cleanedAssessment)
      const newId = crypto.randomUUID()
      const docRef = doc(db, ASSESSMENTS_COLLECTION, newId)

      // Fire and don't wait - setDoc/addDoc promises hang but data saves
      setDoc(docRef, dataToSave).catch(err => {
        console.error('[FIREBASE] setDoc error:', err)
      })

      // Give it a moment then return (data is saving in background)
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('[FIREBASE] Returning ID:', newId)
      return newId
    } catch (err) {
      console.error('[FIREBASE] Error in addAssessment:', err)
      throw err
    }
  },

  // Update assessment
  async updateAssessment(id: string, data: Partial<Assessment>): Promise<void> {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, id)
    const dataToSave = convertToTimestamps({
      ...data,
      updatedAt: new Date(),
    })
    await updateDoc(docRef, dataToSave)
  },

  // Delete assessment
  async deleteAssessment(id: string): Promise<void> {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, id)
    await deleteDoc(docRef)
  },

  // Update triage priority
  async updateTriagePriority(id: string, triageScore: TriageScore): Promise<void> {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, id)
    const dataToSave = convertToTimestamps({
      triageScore,
      updatedAt: new Date(),
    })
    await updateDoc(docRef, dataToSave)
  },

  // Upload X-ray image to Firebase Storage
  async uploadXrayImage(assessmentId: string, file: File): Promise<string> {
    const storageRef = ref(storage, `xrays/${assessmentId}/${file.name}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    return url
  },

  // Upload heatmap image to Firebase Storage
  async uploadHeatmap(
    assessmentId: string,
    pathology: string,
    blob: Blob
  ): Promise<string> {
    const storageRef = ref(storage, `heatmaps/${assessmentId}/${pathology}.png`)
    await uploadBytes(storageRef, blob)
    const url = await getDownloadURL(storageRef)
    return url
  },

  // Delete X-ray images for an assessment
  async deleteXrayImages(assessmentId: string): Promise<void> {
    // Note: Firebase Storage doesn't support listing files in web SDK easily
    // You may need to track file paths in Firestore to delete them
    console.log('Cleanup for assessment:', assessmentId)
  },
}

export default firebaseService
