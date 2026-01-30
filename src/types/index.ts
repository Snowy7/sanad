// Patient and Assessment Types

// X-ray analysis source types
export type XrayAnalysisSource = 'onnx' | 'lmstudio'

// Chat message type for AI conversations
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

// VLM analysis result from LM Studio
export interface VLMAnalysisResult {
  technique?: string
  findings: string
  impressions: string[]
  recommendations: string[]
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical'
}

// Sync types for offline-first architecture
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';

export interface SyncMetadata {
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  localVersion: number;
  serverVersion: number;
  serverId?: string;  // PocketBase record ID
  syncError?: string;
}

export const defaultSyncMetadata: SyncMetadata = {
  syncStatus: 'pending',
  lastSyncedAt: null,
  localVersion: 1,
  serverVersion: 0,
};

// Persisted heatmap for patient detail view
export interface PersistedHeatmap {
  pathology: string;
  probability: number;
  heatmapImageId: string;  // IndexedDB reference
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  chiefComplaint: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vitals {
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  temperature: number | null;
}

export interface Symptom {
  id: string;
  name: string;
  category: 'respiratory' | 'cardiovascular' | 'neurological' | 'trauma' | 'general';
  severity: number; // 1-10
  selected: boolean;
}

export type FindingOverride = 'agree' | 'disagree' | 'adjust' | null;

export interface XrayFinding {
  pathology: string;
  confidence: number;  // AI confidence
  description: string;
  override?: FindingOverride;  // Medic's assessment
  adjustedConfidence?: number; // Medic-adjusted confidence (0-1)
  overrideNote?: string;  // Optional note explaining override
}

export interface XrayAnalysis {
  findings: XrayFinding[];
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  imageUrl: string;
  imageId?: string;  // IndexedDB reference for the original image
  heatmaps?: PersistedHeatmap[];  // Persisted heatmaps for patient detail view
  analyzedAt: Date;
  // LM Studio specific fields
  source?: XrayAnalysisSource;
  vlmAnalysis?: VLMAnalysisResult;
  chatHistory?: ChatMessage[];
}

export interface VoiceNote {
  id: string;
  transcript: string;
  audioBlob?: Blob;
  createdAt: Date;
}

export interface Assessment {
  id: string;
  patientId: string;
  patient: Patient;
  vitals: Vitals;
  symptoms: Symptom[];
  xrayAnalysis: XrayAnalysis | null;
  voiceNotes: VoiceNote[];
  additionalNotes: string;
  triageScore: TriageScore | null;
  createdAt: Date;
  updatedAt: Date;
  // Sync metadata for offline-first architecture
  _sync?: SyncMetadata;
  _deleted?: boolean;  // Soft delete for sync
}

export type TriagePriority = 'immediate' | 'urgent' | 'delayed' | 'minimal';

export interface TriageScore {
  priority: TriagePriority;
  score: number; // 0-100, higher = more urgent
  factors: TriageFactor[];
  recommendation: string;
  overriddenBy?: string;
  overriddenAt?: Date;
  originalPriority?: TriagePriority;
}

export interface TriageFactor {
  name: string;
  weight: number;
  contribution: number;
  description: string;
}

// Store Types

export interface PatientQueueItem {
  assessment: Assessment;
  position: number;
  waitTime: number; // in minutes
  status: 'waiting' | 'in-progress' | 'completed' | 'transferred';
}

// AI Model Types

export interface ModelLoadingState {
  xray: 'idle' | 'loading' | 'ready' | 'error';
  whisper: 'idle' | 'loading' | 'ready' | 'error';
}

export interface XrayInferenceResult {
  pathologies: {
    name: string;
    probability: number;
  }[];
  processingTime: number;
  source?: XrayAnalysisSource;
  vlmResult?: VLMAnalysisResult;
}

export interface WhisperTranscriptionResult {
  text: string;
  language: string;
  processingTime: number;
}

// Form State Types

export interface AssessmentFormState {
  step: 'patient-info' | 'vitals' | 'symptoms' | 'xray' | 'voice' | 'review';
  patient: Partial<Patient>;
  vitals: Vitals;
  selectedSymptoms: string[];
  xrayImage: File | null;
  voiceNotes: VoiceNote[];
  additionalNotes: string;
}

// Default values

export const defaultVitals: Vitals = {
  bloodPressureSystolic: null,
  bloodPressureDiastolic: null,
  heartRate: null,
  respiratoryRate: null,
  oxygenSaturation: null,
  temperature: null,
};

export const SYMPTOMS_LIST: Symptom[] = [
  // Respiratory
  { id: 'dyspnea', name: 'Difficulty Breathing', category: 'respiratory', severity: 8, selected: false },
  { id: 'cough', name: 'Cough', category: 'respiratory', severity: 3, selected: false },
  { id: 'hemoptysis', name: 'Coughing Blood', category: 'respiratory', severity: 9, selected: false },
  { id: 'wheezing', name: 'Wheezing', category: 'respiratory', severity: 5, selected: false },

  // Cardiovascular
  { id: 'chest-pain', name: 'Chest Pain', category: 'cardiovascular', severity: 9, selected: false },
  { id: 'palpitations', name: 'Palpitations', category: 'cardiovascular', severity: 6, selected: false },
  { id: 'syncope', name: 'Fainting/Syncope', category: 'cardiovascular', severity: 8, selected: false },
  { id: 'edema', name: 'Leg Swelling', category: 'cardiovascular', severity: 5, selected: false },

  // Neurological
  { id: 'altered-consciousness', name: 'Altered Consciousness', category: 'neurological', severity: 10, selected: false },
  { id: 'seizure', name: 'Seizure', category: 'neurological', severity: 9, selected: false },
  { id: 'headache-severe', name: 'Severe Headache', category: 'neurological', severity: 7, selected: false },
  { id: 'weakness', name: 'Weakness/Numbness', category: 'neurological', severity: 8, selected: false },

  // Trauma
  { id: 'bleeding-severe', name: 'Severe Bleeding', category: 'trauma', severity: 10, selected: false },
  { id: 'fracture', name: 'Possible Fracture', category: 'trauma', severity: 6, selected: false },
  { id: 'burns', name: 'Burns', category: 'trauma', severity: 7, selected: false },
  { id: 'wound', name: 'Open Wound', category: 'trauma', severity: 5, selected: false },

  // General
  { id: 'fever-high', name: 'High Fever (>39C)', category: 'general', severity: 6, selected: false },
  { id: 'pain-severe', name: 'Severe Pain', category: 'general', severity: 7, selected: false },
  { id: 'vomiting', name: 'Vomiting', category: 'general', severity: 4, selected: false },
  { id: 'dehydration', name: 'Dehydration Signs', category: 'general', severity: 6, selected: false },
];

export const TRIAGE_COLORS: Record<TriagePriority, { bg: string; text: string; border: string }> = {
  immediate: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' },
  urgent: { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600' },
  delayed: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  minimal: { bg: 'bg-gray-200', text: 'text-gray-800', border: 'border-gray-300' },
};

export const TRIAGE_LABELS: Record<TriagePriority, string> = {
  immediate: 'IMMEDIATE',
  urgent: 'URGENT',
  delayed: 'DELAYED',
  minimal: 'MINIMAL',
};
