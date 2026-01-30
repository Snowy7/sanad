# SANAD - Smart AI Nurse Assistant for Disaster

<div align="center">

![SANAD Logo](public/logo.png)

**AI-Powered Medical Triage for Emergency Response**

*Offline-First | Dual AI Backends | Real-time Sync | PWA Ready*

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://sanad-omega.vercel.app/)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)

</div>

---

## Overview

**SANAD** (سند - "Support" in Arabic) is an offline-first Progressive Web Application designed to assist healthcare workers in disaster scenarios with rapid patient triage. It combines dual AI-powered chest X-ray analysis (local ONNX + LM Studio VLM), imaging queue management, mobile unit tracking, and evidence-based triage scoring to prioritize patients when resources are scarce.

### Live Demo

**[https://sanad-omega.vercel.app/](https://sanad-omega.vercel.app/)**

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Dual AI X-ray Analysis** | Local ONNX model (offline) + LM Studio VLM (advanced) |
| **CAM Heatmaps** | Visual pathology localization on X-rays |
| **Medic Override System** | Confirm, adjust, or rule out AI findings |
| **Smart Triage Scoring** | Evidence-based algorithm with vitals, symptoms, X-ray |
| **Imaging Queue** | Prioritize and manage imaging requests |
| **Mobile Unit Tracking** | Manage portable X-ray/ultrasound equipment |
| **AI Chat Assistant** | Context-aware medical assistant sidebar |
| **Voice Documentation** | Speech-to-text for hands-free notes |
| **Offline-First** | All core features work without internet |
| **Real-time Sync** | Firebase cloud sync across devices |
| **PWA Support** | Installable on any device |
| **Guided Onboarding** | Interactive tutorial for new users |

---

## Screenshots

<details>
<summary>Click to view screenshots</summary>

### Home Dashboard
- Quick stats: total assessments, critical cases, pending imaging
- Action cards for new assessment, patient queue, imaging queue

### Assessment Workflow
- Multi-step form with progress indicator
- Patient info, vitals, symptoms, imaging decision, X-ray upload

### X-ray Analysis
- ONNX: 18 pathology detection with heatmaps
- LM Studio: Detailed radiology reports with Q&A

### Imaging Queue
- Priority-sorted patient list
- Mobile unit assignment
- Status tracking (pending → in-progress → completed)

### Patient Detail
- Complete assessment view
- X-ray findings with override history
- Triage score breakdown

</details>

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18.3 + TypeScript + Vite |
| **Styling** | Tailwind CSS + Lucide React icons |
| **State Management** | Zustand (with persistence) |
| **Database** | Firebase Firestore + Cloud Storage |
| **Local Storage** | IndexedDB (via `idb` library) |
| **AI - Local** | ONNX Runtime Web (TorchXRayVision DenseNet) |
| **AI - Advanced** | LM Studio (Vision Language Models) |
| **Speech-to-Text** | Web Speech API / Whisper |
| **PWA** | vite-plugin-pwa |
| **Deployment** | Vercel / Docker + Nginx |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- (Optional) LM Studio for advanced X-ray analysis

### Development

```bash
# Clone the repository
git clone https://github.com/Snowy7/sanad.git
cd sanad

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

### Docker Deployment

```bash
# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Configuration

### Environment Variables

Create a `.env` file:

```env
# Firebase Configuration (required)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# LM Studio (optional - for advanced X-ray analysis)
VITE_LMSTUDIO_URL=http://localhost:1234
```

### LM Studio Setup (Optional)

For advanced X-ray analysis with follow-up Q&A:

1. Download [LM Studio](https://lmstudio.ai/)
2. Load a vision-language model (recommended: `qwen3-vl-radiology-v1`)
3. Start the local server (default port: 1234)
4. Configure in SANAD Settings:
   - Server URL: `http://localhost:1234`
   - Model name: your loaded model
   - Temperature: 0.1 (recommended for medical)

### Model Files

Required in `/public/models/`:

```
public/
├── models/
│   ├── chest_xray.onnx           # Base model (~27 MB)
│   ├── chest_xray_cam.onnx       # CAM model (optional)
│   └── classifier_weights.bin    # For heatmaps (~75 KB)
└── wasm/
    ├── ort-wasm.wasm
    ├── ort-wasm-simd.wasm
    └── ort-wasm-simd-threaded.wasm
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         SANAD App                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   React UI   │  │   Zustand    │  │     IndexedDB        │   │
│  │   + Tailwind │──│   Stores     │──│  - X-ray Images      │   │
│  │              │  │              │  │  - Heatmaps          │   │
│  │              │  │              │  │  - Voice Recordings  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌────────────────────────────────┐   │
│  │   ONNX Runtime Web   │  │        LM Studio API           │   │
│  │   (Offline AI)       │  │   (Advanced AI - Optional)     │   │
│  │   - 18 Pathologies   │  │   - Detailed Reports           │   │
│  │   - CAM Heatmaps     │  │   - Follow-up Q&A              │   │
│  └──────────────────────┘  └────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Service Worker                         │   │
│  │  - App Shell Caching  - Offline Support  - PWA Install   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │ (when online)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Firebase                                  │
│  - Firestore (Real-time Database)                               │
│  - Cloud Storage (Images, Heatmaps)                             │
│  - Multi-device Sync                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input → Zustand Store → IndexedDB (local) → Firebase (cloud)
                ↓
         Triage Engine → Priority Calculation
                ↓
         Imaging Engine → Urgency Assessment
                ↓
         ONNX/LM Studio → X-ray Analysis
```

---

## Features in Detail

### 1. Patient Assessment Workflow

Multi-step form with dynamic navigation:

| Step | Description |
|------|-------------|
| **Patient Info** | Name, age, gender, chief complaint |
| **Vitals** | BP, HR, RR, SpO2, temperature |
| **Symptoms** | 18 categorized symptoms with severity |
| **Imaging Decision** | AI-recommended urgency with override |
| **X-ray Upload** | Optional AI analysis |
| **Voice Notes** | Audio recording + text |
| **Review** | Summary before submission |

### 2. Triage Scoring Algorithm

Automatic priority calculation based on:

**Vital Signs (weighted):**
- Oxygen Saturation: 20 points (most critical)
- Blood Pressure: 15 points
- Respiratory Rate: 15 points
- Heart Rate: 12 points
- Temperature: 8 points

**Priority Levels:**

| Priority | Score | Color | Action |
|----------|-------|-------|--------|
| Immediate | ≥70 | Red | Treat now |
| Urgent | 45-69 | Orange | Treat soon |
| Delayed | 20-44 | Green | Can wait |
| Minimal | <20 | Gray | Minor care |

### 3. Dual AI X-ray Analysis

**ONNX Model (Default - Offline)**
- Runs entirely in browser
- 18 pathology detection
- CAM heatmap visualization
- ~2-5 second inference

**LM Studio (Advanced - Optional)**
- Requires local server
- Structured radiology reports
- Follow-up Q&A capability
- Severity classification

**Detected Pathologies:**
```
Atelectasis, Consolidation, Infiltration, Pneumothorax,
Edema, Emphysema, Fibrosis, Effusion, Pneumonia,
Pleural Thickening, Cardiomegaly, Nodule, Mass, Hernia,
Lung Lesion, Fracture, Lung Opacity, Enlarged Cardiomediastinum
```

### 4. Medic Override System

| Override | Effect | Badge |
|----------|--------|-------|
| **Agree** (✓) | Confirms AI finding | Confirmed |
| **Disagree** (✗) | Rules out (confidence → 0) | Ruled Out |
| **Adjust** (%) | Custom confidence level | Adjusted |

### 5. Imaging Queue Management

- Priority-sorted patient list
- Filter by urgency, status, imaging type
- Mobile unit assignment
- Status tracking: `pending → in-progress → completed`

**Urgency Levels:**

| Urgency | Triage Score | Color |
|---------|--------------|-------|
| Critical | ≥70 | Red |
| High | 45-69 | Orange |
| Routine | 20-44 | Blue |
| Not Required | <20 | Gray |

### 6. Mobile Unit Management

Track portable imaging equipment:

- **Unit Types:** X-Ray Only, Ultrasound Only, Both
- **Status:** Available, Assigned, Imaging, Offline
- Add/edit/delete units
- Assignment tracking

### 7. AI Chat Assistant

Context-aware sidebar:

- Knows current page and patient
- Quick suggestion buttons
- Follow-up Q&A for X-ray analysis
- Persistent chat history

### 8. Onboarding Tutorial

Interactive guided tour:

1. Welcome introduction
2. New Assessment button
3. Patient Queue navigation
4. Imaging Queue overview
5. Navigation bar
6. Settings access

---

## Offline Support

### What Works Offline

| Feature | Offline | Notes |
|---------|---------|-------|
| New Assessment | ✅ | Full workflow |
| X-ray Analysis (ONNX) | ✅ | Local model |
| X-ray Analysis (LM Studio) | ❌ | Requires server |
| Patient Queue | ✅ | Local data |
| Edit/Delete | ✅ | Syncs later |
| Voice Recording | ✅ | Stored locally |
| AI Chat | ❌ | Requires connection |

### Sync Strategy

1. All changes saved to IndexedDB immediately
2. Firebase sync attempted when online
3. Conflict detection via version tracking
4. Offline indicator in UI

---

## Hardware Requirements

### Minimum

| Component | Requirement |
|-----------|-------------|
| CPU | Modern CPU with SIMD (2015+) |
| RAM | 4GB (8GB recommended) |
| Storage | ~350MB for cached models |
| Browser | Chrome 80+, Firefox 78+, Edge 80+ |

### Resource Usage

| Feature | Memory | Download | Time |
|---------|--------|----------|------|
| X-Ray Analysis | ~200MB | ~27MB | 2-5s |
| CAM Heatmaps | +50MB | Included | +1-2s |
| Voice (Whisper) | ~500MB | ~244MB | 3-10s |
| Basic UI | ~50MB | ~2MB | Instant |

---

## Project Structure

```
sanad/
├── public/
│   ├── models/              # ONNX models
│   └── wasm/                # ONNX runtime files
├── src/
│   ├── components/
│   │   ├── Assessment/      # Form steps
│   │   ├── Chat/            # AI chat UI
│   │   ├── Imaging/         # Queue components
│   │   ├── Layout/          # App layout
│   │   ├── Onboarding/      # Tutorial
│   │   └── ui/              # Design system
│   ├── context/             # React contexts
│   ├── hooks/               # Custom hooks
│   ├── lib/
│   │   ├── triageEngine.ts  # Triage algorithm
│   │   ├── imagingUrgencyEngine.ts
│   │   ├── firebase.ts      # Firebase config
│   │   └── designTokens.ts  # Design constants
│   ├── pages/               # Route pages
│   ├── services/            # API services
│   ├── store/               # Zustand stores
│   ├── types/               # TypeScript types
│   └── App.tsx
├── DOCUMENTATION.md         # Detailed docs
└── README.md
```

---

## API Reference

### Zustand Stores

**Patient Store:**
```typescript
usePatientStore()
  .assessments        // Assessment[]
  .addAssessment()    // Create new
  .updateAssessment() // Update existing
  .deleteAssessment() // Remove
```

**Mobile Unit Store:**
```typescript
useMobileUnitStore()
  .units              // MobileUnit[]
  .addUnit()          // Create
  .assignUnit()       // Assign to patient
  .completeImaging()  // Mark done
```

**Settings Store:**
```typescript
useSettingsStore()
  .xrayModel          // 'onnx' | 'lmstudio'
  .lmStudioConfig     // Server config
```

### Triage Engine

```typescript
import { calculateTriageScore } from './lib/triageEngine'

const score = calculateTriageScore({
  vitals: { ... },
  symptoms: [ ... ],
  xrayAnalysis: { ... }
})
// Returns: { priority, score, factors }
```

### Imaging Urgency Engine

```typescript
import { calculateImagingUrgency } from './lib/imagingUrgencyEngine'

const urgency = calculateImagingUrgency(vitals, symptoms)
// Returns: { urgency, type, region, indication }
```

---

## Development

### Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview build
npm run lint     # Run ESLint
```

### Testing Offline

1. Build: `npm run build`
2. Preview: `npm run preview`
3. Open DevTools → Application → Service Workers
4. Check "Offline"
5. Verify app functionality

### Adding New Symptoms

Edit `src/types/index.ts`:

```typescript
export const SYMPTOMS_LIST: Symptom[] = [
  // Add new symptom
  {
    id: 'new-symptom',
    name: 'New Symptom',
    category: 'category',
    severity: 5
  },
  // ...
]
```

---

## Medical Disclaimer

> **SANAD is a decision support tool only.**
>
> - Not a substitute for professional medical judgment
> - AI predictions must be verified by qualified providers
> - Triage scores are recommendations, not diagnoses
> - Always prioritize clinical assessment

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Please follow existing code style and include tests where applicable.

---

## Resources

### Documentation

- [Full Documentation](DOCUMENTATION.md) - Comprehensive technical docs
- [Design Tokens](src/lib/designTokens.ts) - Color and style constants
- [Type Definitions](src/types/index.ts) - All TypeScript interfaces

### External Resources

- [TorchXRayVision](https://github.com/mlmed/torchxrayvision) - X-ray models
- [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) - Browser inference
- [LM Studio](https://lmstudio.ai/) - Local LLM server
- [Firebase](https://firebase.google.com/) - Cloud backend
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide](https://lucide.dev/) - Icons
- [Vite](https://vitejs.dev/) - Build tool

### Research

- [CheXNet Paper](https://arxiv.org/abs/1711.05225) - Deep learning for chest X-rays
- [Class Activation Maps](https://arxiv.org/abs/1512.04150) - CAM visualization

---

## License

This project is licensed under **CC BY-NC-ND 4.0** (Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International).

- ✅ Personal and educational use
- ✅ Attribution required
- ❌ Commercial use
- ❌ Redistribution of modified versions

See [LICENSE](LICENSE) for full details.

---

## Acknowledgments

- [TorchXRayVision](https://github.com/mlmed/torchxrayvision) - X-ray analysis models
- [ONNX Runtime](https://github.com/microsoft/onnxruntime) - Browser-based inference
- [Firebase](https://firebase.google.com/) - Real-time database and storage
- [Hugging Face](https://huggingface.co/) - Transformers.js for speech
- [Lucide](https://lucide.dev/) - Beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

---

## Contact & Support

- **Issues:** [GitHub Issues](https://github.com/Snowy7/sanad/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Snowy7/sanad/discussions)

---

<div align="center">

**Built with ❤️ for healthcare workers in challenging environments**

</div>
