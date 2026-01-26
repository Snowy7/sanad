# SANAD - Smart AI Nurse Assistant for Disaster

<div align="center">

**AI-Powered Medical Triage for Emergency Response**

*Works Completely Offline | Cloud Sync | PWA Ready*

</div>

---

## Overview

SANAD (سند - "Support" in Arabic) is an offline-first Progressive Web Application designed to assist healthcare workers in disaster scenarios with rapid patient triage. It combines AI-powered chest X-ray analysis with CAM heatmaps, voice documentation, and evidence-based triage scoring to prioritize patients when resources are scarce.

### Key Features

- **Chest X-Ray Analysis**: AI-powered pathology detection with Class Activation Map (CAM) heatmaps
- **Medic Override System**: Confirm, adjust, or rule out AI findings with clinical judgment
- **Voice Documentation**: Speech-to-text for hands-free note taking
- **Smart Triage Scoring**: Evidence-based algorithm considering vitals, symptoms, and X-ray findings
- **Offline-First**: All AI models run locally in the browser - no internet required
- **Cloud Sync**: Optional PocketBase backend for multi-device synchronization
- **Patient Queue**: Priority-sorted patient management with detailed views
- **PWA Support**: Installable on any device like a native app

---

## [Demo](https://sanad-omega.vercel.app/)

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| State Management | Zustand + IndexedDB |
| Backend (Optional) | PocketBase |
| X-Ray AI Model | TorchXRayVision DenseNet → ONNX Runtime Web |
| CAM Heatmaps | Class Activation Maps for pathology localization |
| Speech-to-Text | Whisper via @huggingface/transformers |
| PWA | vite-plugin-pwa |
| Deployment | Docker + Nginx |

---

## Quick Start

### Development

```bash
# Clone the repository
git clone https://github.com/your-username/sanad.git
cd sanad

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Docker Deployment

```bash
# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

This starts:
- **Frontend**: http://localhost:8080
- **PocketBase Admin**: http://localhost:8090/_/

### Environment Configuration

Copy `.env.example` to `.env` and customize:

```env
# Frontend port
FRONTEND_PORT=8080

# API URL for PocketBase
VITE_API_URL=http://localhost:8090

# PocketBase port
POCKETBASE_PORT=8090

# CORS origins (comma-separated or * for all)
ALLOWED_ORIGINS=*
```

---

## Architecture

### Offline-First Design

SANAD is built with an offline-first architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   React UI  │  │   Zustand   │  │     IndexedDB       │  │
│  │             │──│   Store     │──│  - Assessments      │  │
│  │             │  │             │  │  - X-ray Images     │  │
│  │             │  │             │  │  - Heatmaps         │  │
│  │             │  │             │  │  - Voice Recordings │  │
│  │             │  │             │  │  - Sync Queue       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Service Worker                       ││
│  │  - App Shell Caching                                    ││
│  │  - ONNX Model Caching                                   ││
│  │  - Offline Fallback                                     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                           │ (when online)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      PocketBase                              │
│  - REST API                                                  │
│  - SQLite Database                                           │
│  - File Storage                                              │
│  - Admin Dashboard                                           │
└─────────────────────────────────────────────────────────────┘
```

### Sync Strategy

1. **Offline Changes**: All operations are queued in IndexedDB
2. **Coming Online**: Queue is processed, blobs uploaded, remote changes pulled
3. **Conflict Resolution**: Last-write-wins with manual override option

---

## Features in Detail

### X-Ray Analysis with CAM Heatmaps

The X-ray analysis now includes Class Activation Map (CAM) heatmaps that visualize where the AI model detected potential pathologies:

- **Original View**: Standard X-ray image
- **Heatmap Overlays**: Toggle between different pathology heatmaps
- **Color Scale**: Red/Orange = high suspicion, Blue/Green = low suspicion

### Medic Override System

Healthcare providers can override AI findings:

| Override | Effect |
|----------|--------|
| **Agree** (✓) | Confirms AI finding |
| **Disagree** (✗) | Rules out pathology (sets confidence to 0) |
| **Adjust** (%) | Fine-tune confidence with slider |

Overrides are tracked and displayed in patient detail view with:
- Original AI confidence vs medic adjustment
- Visual comparison bars
- Override badges (Confirmed, Ruled Out, Adjusted)

### Patient Detail View

Enhanced patient detail view includes:
- Full X-ray with heatmap toggle
- AI vs Medic finding comparison cards
- Override history and notes
- Sync status indicator

### Landing Page

First-time visitors see an onboarding page with:
- Feature highlights
- PWA install prompt
- Medical disclaimer
- Quick start guide

---

## Hardware Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **CPU** | Any modern CPU (2015+) with SIMD support |
| **RAM** | 4GB (8GB recommended) |
| **Storage** | ~350MB for cached models |
| **Browser** | Chrome 80+, Firefox 78+, Edge 80+, Safari 15+ |
| **OS** | Windows, macOS, Linux, Android, iOS |

### Resource Usage by Feature

| Feature | Memory | First Load | Inference Time |
|---------|--------|------------|----------------|
| **X-Ray Analysis** | ~200MB | ~27MB download | 2-5 seconds |
| **CAM Heatmaps** | +50MB | Included | +1-2 seconds |
| **Voice (Whisper)** | ~500MB | ~244MB download | 3-10 seconds |
| **Basic UI/Triage** | ~50MB | ~2MB | Instant |

---

## Model Setup

### X-Ray Analysis Model with CAM

The app uses a pre-trained DenseNet121 model with CAM support:

```bash
# Run conversion script
python scripts/convert_xray_with_cam.py
```

This creates:
- `public/models/chest_xray_cam.onnx` (~27 MB)
- `public/models/classifier_weights.bin` (~75 KB)

### WASM Files (for Offline Support)

```bash
mkdir -p public/wasm
curl -o public/wasm/ort-wasm.wasm https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/ort-wasm.wasm
curl -o public/wasm/ort-wasm-simd.wasm https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/ort-wasm-simd.wasm
curl -o public/wasm/ort-wasm-simd-threaded.wasm https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/ort-wasm-simd-threaded.wasm
```

---

## Usage Guide

### 1. First Visit

On first visit, you'll see the landing page with:
- Feature overview
- PWA install prompt (add to home screen)
- Medical disclaimer

Click "Get Started" to proceed.

### 2. New Patient Assessment

1. Click "New Assessment"
2. Fill in patient information
3. Record vital signs
4. Select presenting symptoms
5. (Optional) Upload a chest X-ray
   - View AI analysis results
   - Toggle heatmaps to see suspected areas
   - Override findings if needed
6. (Optional) Record voice notes
7. Review and submit

### 3. X-Ray Override Workflow

When viewing X-ray analysis:
1. Review AI confidence for each pathology
2. Click ✓ to confirm, ✗ to rule out, or % to adjust
3. Use the slider to fine-tune confidence if adjusting
4. Add notes explaining your clinical reasoning
5. Overall risk automatically recalculates

### 4. Patient Detail View

View complete assessment with:
- X-ray with heatmap toggle buttons
- Finding comparison cards showing AI vs Medic values
- Override badges and history
- Sync status indicator

### 5. Cloud Sync (Optional)

If PocketBase is configured:
- Data syncs automatically when online
- Sync status shown in header
- Conflict resolution if same patient edited on multiple devices

---

## Docker Deployment

### Production Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with production values

# Build and deploy
docker-compose up -d --build
```

### Nginx Configuration

The included Nginx config handles:
- WASM files with proper MIME types and headers
- ONNX model files
- Cross-Origin headers for SharedArrayBuffer support
- SPA routing fallback
- API proxy to PocketBase
- Gzip compression
- Security headers

### PocketBase Setup

1. Access PocketBase admin: http://localhost:8090/_/
2. Create admin account
3. Collections are auto-created on first sync

---

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Testing Sync

1. Start with `docker-compose up`
2. Create an assessment
3. Check PocketBase admin for synced data
4. Test offline by disabling network
5. Make changes, re-enable network, verify sync

### Testing Offline

1. Build app: `npm run build`
2. Serve: `npm run preview`
3. Load app in browser
4. Open DevTools → Application → Service Workers
5. Check "Offline"
6. Verify app still works

---

## Medical Disclaimer

**SANAD is intended as a decision support tool only.**

- Not a substitute for professional medical judgment
- AI predictions should be verified by qualified healthcare providers
- Triage scores are recommendations, not diagnoses
- Always prioritize clinical assessment over AI suggestions

---

## License

This project is licensed under the **CC BY-NC-ND 4.0** (Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International) license. See [LICENSE](LICENSE) for details.

You may use this software for personal and educational purposes. Commercial use and redistribution are not permitted.

---

## Acknowledgments

- [TorchXRayVision](https://github.com/mlmed/torchxrayvision) - X-ray analysis models
- [PocketBase](https://pocketbase.io/) - Backend in a single file
- [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) - Browser-based inference
- [Hugging Face Transformers.js](https://github.com/xenova/transformers.js) - Speech-to-text
- [Lucide](https://lucide.dev/) - Icons

---

## Contact

For questions, issues, or suggestions, please open a GitHub issue.
