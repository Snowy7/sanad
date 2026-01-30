# SANAD - AI-Powered Medical Triage System

> Comprehensive documentation for features, workflows, and architecture

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Workflows](#workflows)
- [Data Models](#data-models)
- [AI Systems](#ai-systems)
- [State Management](#state-management)
- [Offline Support](#offline-support)
- [Configuration](#configuration)
- [Project Structure](#project-structure)

---

## Overview

**SANAD** is an AI-powered medical triage system designed for emergency assessment and patient prioritization in resource-limited settings. It works offline-first with progressive web app (PWA) capabilities and integrates multiple AI models for X-ray analysis.

### Key Capabilities

- **Patient Assessment**: Multi-step form capturing demographics, vitals, symptoms
- **AI Triage Scoring**: Automatic priority calculation based on clinical data
- **X-ray Analysis**: Dual AI backends (offline ONNX + online LM Studio)
- **Imaging Queue**: Manage and prioritize imaging requests
- **Mobile Units**: Track portable X-ray/ultrasound equipment
- **Offline Support**: Works without internet, syncs when connected
- **Medic Override**: AI suggestions can be overridden at every step

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18.3 + TypeScript + Vite |
| State Management | Zustand (with persistence) |
| UI | Tailwind CSS + Lucide React icons |
| Database | Firebase Firestore + Cloud Storage |
| Local Storage | IndexedDB (via `idb` library) |
| AI Models | ONNX Runtime Web (local) + LM Studio (external VLM) |
| PWA | Vite PWA Plugin |

---

## Features

### 1. Patient Assessment

A multi-step form workflow:

| Step | Description |
|------|-------------|
| Patient Info | Name, age, gender, chief complaint |
| Vitals | Blood pressure, heart rate, respiratory rate, SpO2, temperature |
| Symptoms | Multi-select from 18 categorized symptoms |
| Imaging Decision | AI-calculated urgency with override option |
| X-ray Upload | Optional AI-powered chest X-ray analysis |
| Voice Notes | Audio recording with text notes |
| Review | Summary before submission |

### 2. Triage Scoring Engine

Automatic priority calculation based on:

- **Vitals** (weighted contributions):
  - Oxygen Saturation: 20 points (most critical)
  - Blood Pressure: 15 points
  - Respiratory Rate: 15 points
  - Heart Rate: 12 points
  - Temperature: 8 points

- **Symptoms**: Base contribution + severity bonus per symptom

- **X-ray Findings**: Additional points based on risk level

**Priority Levels:**

| Priority | Score Range | Color |
|----------|-------------|-------|
| Immediate | ≥ 70 | Red |
| Urgent | 45-69 | Orange |
| Delayed | 20-44 | Green |
| Minimal | < 20 | Gray |

### 3. X-ray Analysis

**Dual Backend Support:**

| Backend | Use Case | Features |
|---------|----------|----------|
| ONNX (Default) | Offline/Fast | 18 pathologies, heatmaps, works without internet |
| LM Studio | Advanced | Detailed reports, follow-up Q&A, requires local server |

**Detected Pathologies (ONNX):**
- Atelectasis, Consolidation, Infiltration, Pneumothorax
- Edema, Emphysema, Fibrosis, Effusion, Pneumonia
- Pleural Thickening, Cardiomegaly, Nodule, Mass, Hernia
- Lung Lesion, Fracture, Lung Opacity, Enlarged Cardiomediastinum

**Medic Override Options:**
- Agree with finding
- Disagree (sets confidence to 0)
- Adjust confidence manually

### 4. Imaging Queue Management

- View pending imaging requests sorted by urgency
- Filter by: urgency level, status, imaging type
- Assign mobile units to patients
- Track imaging status: pending → in-progress → completed

**Urgency Levels:**

| Urgency | Trigger |
|---------|---------|
| Critical | Triage score ≥ 70 |
| High | Triage score 45-69 |
| Routine | Triage score 20-44 |
| Not Required | Triage score < 20 |

### 5. Mobile Unit Management

Track portable imaging equipment:

- **Unit Types**: X-Ray Only, Ultrasound Only, Both
- **Status**: Available, Assigned, Imaging, Offline
- Add/edit/delete units
- View current assignments
- Toggle online/offline status

### 6. AI Chat Assistant

Context-aware chat sidebar:

- Knows current page and patient context
- Provides quick suggestions based on context
- Follow-up questions for X-ray analysis (LM Studio)
- Persistent chat history

### 7. Onboarding Tutorial

Guided tour for new users:

1. Welcome introduction
2. New Assessment button
3. Patient Queue navigation
4. Imaging Queue overview
5. Navigation bar explanation
6. Settings access

---

## Workflows

### New Patient Assessment

```
Home → "New Assessment" → Patient Info → Vitals → Symptoms
→ Imaging Decision → [X-ray Upload] → Voice Notes → Review → Submit
```

**Details:**
1. Click "New Assessment" from Home
2. Fill patient demographics
3. Enter vital signs (with validation)
4. Select symptoms from categorized checklist
5. Review AI imaging recommendation, accept or override
6. Optionally upload chest X-ray for analysis
7. Record voice notes or add text notes
8. Review complete summary
9. Submit - saves to Firebase and local IndexedDB

### Patient Triage Review

```
Home → "Patient Queue" → [Filter by priority] → Click patient → View details
```

**Actions available:**
- View full assessment details
- Edit assessment (returns to form)
- Delete assessment
- Modify triage priority (override)

### Imaging Workflow

```
Home → "Imaging Queue" → Select patient → Assign Unit → Start Imaging → Complete
```

**Status Flow:**
```
pending → in-progress → completed
```

### Mobile Unit Management

```
Imaging Queue → "Manage Units" → Add/Edit/Delete units
```

---

## Data Models

### Assessment (Main Entity)

```typescript
interface Assessment {
  id: string
  patientId: string
  patient: Patient
  vitals: Vitals
  symptoms: Symptom[]
  xrayAnalysis?: XrayAnalysis
  voiceNotes: VoiceNote[]
  additionalNotes: string
  triageScore?: TriageScore
  imagingRequest?: ImagingRequest
  createdAt: Date
  updatedAt: Date
  _sync?: SyncMetadata
  _deleted?: boolean
}
```

### Patient

```typescript
interface Patient {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  chiefComplaint: string
  createdAt: Date
  updatedAt: Date
}
```

### Vitals

```typescript
interface Vitals {
  bloodPressure: { systolic: number; diastolic: number }
  heartRate: number
  respiratoryRate: number
  oxygenSaturation: number
  temperature: number
  recordedAt: Date
}
```

### Triage Score

```typescript
interface TriageScore {
  priority: 'immediate' | 'urgent' | 'delayed' | 'minimal'
  score: number
  factors: TriageFactor[]
  calculatedAt: Date
  overriddenBy?: string
  overriddenAt?: Date
  originalPriority?: TriagePriority
}
```

### X-ray Analysis

```typescript
interface XrayAnalysis {
  imageId: string
  imageUrl?: string
  findings: XrayFinding[]
  overallRisk: 'critical' | 'high' | 'moderate' | 'low' | 'normal'
  processingTime: number
  analyzedAt: Date
  source: 'onnx' | 'lmstudio' | 'demo'
  chatHistory?: ChatMessage[]
  heatmapUrls?: Record<string, string>
  vlmAnalysis?: VLMAnalysisResult
}
```

### Imaging Request

```typescript
interface ImagingRequest {
  urgency: ImagingUrgency
  urgencyScore: number
  recommendedType: ImagingType
  recommendedRegion: BodyRegion
  clinicalIndication: string
  status: ImagingStatus
  assignedUnitId?: string
  startedAt?: Date
  completedAt?: Date
  overridden?: boolean
  originalUrgency?: ImagingUrgency
}
```

---

## AI Systems

### ONNX X-ray Analysis

**Model**: TorchXRayVision DenseNet (chest_xray.onnx)

**Pipeline:**
1. Center crop image to square
2. Resize to 224×224
3. Convert to grayscale
4. Normalize to [-1, 1] range
5. Run ONNX inference
6. Generate heatmaps (if CAM model available)

**Heatmap Generation:**
- Uses Class Activation Maps (CAM)
- Combines feature maps with classifier weights
- Produces per-pathology visualizations
- Stored in IndexedDB for later viewing

### LM Studio Integration

**Configuration:**
- Server URL: `http://localhost:1234` (default)
- Model: configurable (e.g., `qwen3-vl-radiology-v1`)
- Temperature: 0.1 (low for consistency)
- Max tokens: 2048

**Features:**
- Structured radiology reports
- Severity classification
- Follow-up Q&A with image context
- Automatic fallback to ONNX if unavailable

**Output Sections:**
- TECHNIQUE: Image quality assessment
- FINDINGS: Systematic observations
- IMPRESSIONS: Ranked findings by significance
- RECOMMENDATIONS: Suggested actions
- SEVERITY: Overall classification

### Triage Engine

**Algorithm:**
```
1. Calculate vitals score (weighted thresholds)
2. Calculate symptoms score (base + severity)
3. Calculate X-ray score (if available)
4. Normalize total to 0-100
5. Map to priority level
```

**Critical Pathology Bonuses:**
- Pneumothorax: +5 extra
- Pneumonia: +5 extra
- Edema: +5 extra

### Imaging Urgency Engine

**Factors Evaluated:**
- Vital sign abnormalities (SpO2, RR, HR, BP, temp)
- Symptom indicators (hemoptysis, dyspnea, chest pain, etc.)
- Smart body region mapping from symptoms

**Outputs:**
- Urgency level (critical/high/routine/not-required)
- Recommended imaging type (xray/ultrasound/both)
- Recommended body region
- Clinical indication text

---

## State Management

### Zustand Stores

| Store | Purpose | Persistence |
|-------|---------|-------------|
| patientStore | Assessments, Firebase sync | Firebase + IndexedDB |
| mobileUnitStore | Mobile unit tracking | localStorage |
| onboardingStore | Tutorial progress | localStorage |
| settingsStore | App configuration | localStorage |

### Patient Store Actions

- `initialize()`: Subscribe to Firebase real-time updates
- `addAssessment()`: Create new assessment
- `updateAssessment()`: Update existing
- `deleteAssessment()`: Remove assessment
- `updateTriagePriority()`: Modify triage score
- `updateImagingRequest()`: Update imaging details

### IndexedDB Stores

| Store | Content |
|-------|---------|
| xray-images | Original uploaded X-ray files |
| voice-recordings | Audio blobs + transcripts |
| xray-heatmaps | Generated CAM visualizations |
| sync-queue | Pending sync operations |

---

## Offline Support

### Architecture

```
┌─────────────────────────────────────────────────┐
│                    App Layer                     │
├─────────────────────────────────────────────────┤
│  Zustand Stores (Memory + Persistence)          │
├─────────────────────────────────────────────────┤
│  IndexedDB          │  Firebase                  │
│  - Images           │  - Assessments             │
│  - Heatmaps         │  - Real-time sync          │
│  - Voice recordings │                            │
│  - Sync queue       │                            │
├─────────────────────────────────────────────────┤
│  ONNX Models (Local)                            │
│  - No internet required for X-ray analysis      │
└─────────────────────────────────────────────────┘
```

### Offline Capabilities

- Full assessment workflow without internet
- X-ray analysis using local ONNX models
- Data persists in IndexedDB
- Syncs to Firebase when connection restored
- Conflict detection and resolution

### Sync Status

Each assessment tracks:
- `syncStatus`: synced | pending | error
- `lastSyncedAt`: Timestamp of last sync
- `localVersion` / `serverVersion`: For conflict detection
- `serverId`: Firebase document ID

---

## Configuration

### Firebase Setup

Configuration in `src/lib/firebase.ts`:
- Project ID: sanad-fa765
- Firestore for document storage
- Cloud Storage for file uploads

### LM Studio Setup

1. Install LM Studio locally
2. Load a vision-language model (e.g., qwen3-vl-radiology-v1)
3. Start the local server (default port: 1234)
4. Configure in Settings page:
   - Server URL
   - Model name
   - API key (optional)
   - Max tokens
   - Temperature

### Model Files

Required in `/public/models/`:
```
chest_xray.onnx          # Base classification model
chest_xray_cam.onnx      # Optional: with CAM support
classifier_weights.bin   # For heatmap generation
```

ONNX Runtime WASM files in `/public/wasm/`

---

## Project Structure

```
src/
├── components/
│   ├── Assessment/        # Form step components
│   │   ├── PatientInfo.tsx
│   │   ├── VitalsForm.tsx
│   │   ├── SymptomsChecklist.tsx
│   │   ├── ImagingDecision.tsx
│   │   ├── VoiceRecorder.tsx
│   │   ├── AssessmentReview.tsx
│   │   └── XrayUpload/
│   │       ├── index.tsx
│   │       ├── ImageUploader.tsx
│   │       ├── ModelSelector.tsx
│   │       ├── AnalysisResults.tsx
│   │       └── HeatmapViewer.tsx
│   ├── Chat/              # AI chat components
│   │   ├── ChatSidebar.tsx
│   │   ├── ChatFAB.tsx
│   │   ├── ChatMessage.tsx
│   │   └── ChatInput.tsx
│   ├── Imaging/           # Imaging queue components
│   │   ├── ImagingQueueCard.tsx
│   │   └── AssignUnitModal.tsx
│   ├── Layout/            # App layout
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── OfflineIndicator.tsx
│   ├── Onboarding/        # Tutorial system
│   ├── PatientDetail/     # Patient view components
│   ├── Triage/            # Triage display
│   └── ui/                # Design system
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       └── SectionHeader.tsx
├── context/
│   └── ChatContext.tsx    # Chat state provider
├── hooks/
│   ├── useXrayAnalysis.ts # ONNX + LM Studio analysis
│   ├── useHeatmapLoader.ts
│   ├── useFirstVisit.ts
│   └── useContextualChat.ts
├── lib/
│   ├── triageEngine.ts    # Triage scoring algorithm
│   ├── imagingUrgencyEngine.ts
│   ├── firebase.ts        # Firebase configuration
│   ├── chatPrompts.ts     # Chat system prompts
│   └── designTokens.ts    # Design system constants
├── pages/
│   ├── Home.tsx           # Dashboard
│   ├── Assessment.tsx     # Assessment form
│   ├── Queue.tsx          # Patient queue
│   ├── PatientDetail.tsx  # Patient view
│   ├── ImagingQueue.tsx   # Imaging management
│   ├── MobileUnits.tsx    # Unit management
│   ├── Settings.tsx       # App settings
│   └── LandingPage.tsx    # First-visit landing
├── services/
│   ├── lmStudioService.ts # LM Studio API client
│   ├── api.ts             # Backend API
│   ├── syncService.ts     # Sync orchestration
│   └── blobUploader.ts    # File upload service
├── store/
│   ├── patientStore.ts    # Main data store
│   ├── mobileUnitStore.ts # Mobile units
│   ├── onboardingStore.ts # Tutorial state
│   └── settingsStore.ts   # App settings
├── types/
│   └── index.ts           # TypeScript interfaces
└── App.tsx                # Root component
```

---

## Design System

### Colors

**Triage Priority:**
| Priority | Background | Text |
|----------|------------|------|
| Immediate | bg-red-500 | white |
| Urgent | bg-amber-500 | white |
| Delayed | bg-green-500 | white |
| Minimal | bg-gray-200 | gray-700 |

**Imaging Urgency:**
| Urgency | Background |
|---------|------------|
| Critical | bg-red-500 |
| High | bg-orange-500 |
| Routine | bg-blue-500 |
| Not Required | bg-gray-200 |

### Components

**Button Variants:**
- `primary`: Blue, main actions
- `secondary`: Gray outline, secondary actions
- `danger`: Red, destructive actions

**Card Variants:**
- Default: White background, shadow
- `flat`: Gray background, no shadow

---

## Development

### Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build (TypeScript + Vite)
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Environment

- Node.js 18+
- npm 9+
- LM Studio (optional, for advanced X-ray analysis)

### PWA Installation

The app is installable as a PWA:
1. Open in Chrome/Edge on mobile
2. Click "Add to Home Screen" prompt
3. App works offline after installation

---

## License

MIT License - See LICENSE file for details.
