import { useState, useCallback, useRef, useEffect } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { XrayAnalysis, XrayFinding, FindingOverride, PersistedHeatmap, ChatMessage } from '../../../types'
import { useXrayAnalysis, PathologyHeatmap } from '../../../hooks/useXrayAnalysis'
import { saveHeatmap, saveXrayImage } from '../../../store/patientStore'
import { useSettingsStore } from '../../../store/settingsStore'
import { SectionHeader, Card } from '../../ui'
import ImageUploader, { ImagePreview } from './ImageUploader'
import ModelSelector from './ModelSelector'
import AnalysisResults from './AnalysisResults'
import HeatmapViewer from './HeatmapViewer'
import XrayAIChat from '../XrayAIChat'

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

async function persistHeatmaps(
  assessmentId: string,
  heatmaps: PathologyHeatmap[]
): Promise<PersistedHeatmap[]> {
  const persisted: PersistedHeatmap[] = []
  for (const heatmap of heatmaps) {
    const blob = await dataUrlToBlob(heatmap.heatmapDataUrl)
    const heatmapImageId = await saveHeatmap(assessmentId, heatmap.name, heatmap.probability, blob)
    persisted.push({ pathology: heatmap.name, probability: heatmap.probability, heatmapImageId })
  }
  return persisted
}

interface XrayUploadProps {
  image: File | null
  analysis: XrayAnalysis | null
  onImageChange: (image: File | null) => void
  onAnalysisComplete: (analysis: XrayAnalysis | null) => void
  assessmentId?: string
}

export default function XrayUpload({
  image: _image,
  analysis,
  onImageChange,
  onAnalysisComplete,
  assessmentId,
}: XrayUploadProps) {
  const [preview, setPreview] = useState<string | null>(analysis?.imageUrl || null)
  const [isDragging, setIsDragging] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(analysis?.chatHistory || [])

  const {
    analyze, isLoading, error, isModelLoading, modelLoadingProgress, isDemoMode,
    heatmaps, selectedHeatmap, setSelectedHeatmap,
    lmStudioConnectionStatus, vlmRawResponse, checkLMStudioConnection, imageBase64,
  } = useXrayAnalysis()

  const { xrayModel, setXrayModel } = useSettingsStore()

  const tempAssessmentIdRef = useRef<string | null>(null)
  const pendingAnalysisRef = useRef<{ imageId: string; imageUrl: string; result: { pathologies: { name: string; probability: number }[] } } | null>(null)

  useEffect(() => {
    const persistAndComplete = async () => {
      if (heatmaps.length > 0 && pendingAnalysisRef.current && tempAssessmentIdRef.current) {
        const { imageId, imageUrl, result } = pendingAnalysisRef.current
        const persistedHeatmaps = await persistHeatmaps(tempAssessmentIdRef.current, heatmaps)
        onAnalysisComplete({
          findings: result.pathologies.map((p) => ({
            pathology: p.name, confidence: p.probability, description: getPathologyDescription(p.name),
          })),
          overallRisk: getOverallRisk(result.pathologies),
          imageUrl, imageId, heatmaps: persistedHeatmaps, analyzedAt: new Date(),
        })
        pendingAnalysisRef.current = null
        tempAssessmentIdRef.current = null
      }
    }
    persistAndComplete()
  }, [heatmaps, onAnalysisComplete])

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    onImageChange(file)
    setChatHistory([])

    const result = await analyze(file)
    if (result) {
      const tempId = assessmentId || `temp-${crypto.randomUUID()}`
      tempAssessmentIdRef.current = tempId
      const imageId = await saveXrayImage(tempId, file)

      if (result.source === 'lmstudio' && result.vlmResult) {
        onAnalysisComplete({
          findings: result.pathologies.map((p) => ({
            pathology: p.name, confidence: p.probability, description: getPathologyDescription(p.name),
          })),
          overallRisk: mapVLMSeverityToRisk(result.vlmResult.severity),
          imageUrl: url, imageId, analyzedAt: new Date(), source: 'lmstudio', vlmAnalysis: result.vlmResult,
        })
      } else {
        if (heatmaps.length === 0) {
          setTimeout(async () => {
            if (heatmaps.length > 0) {
              pendingAnalysisRef.current = { imageId, imageUrl: url, result }
            } else {
              onAnalysisComplete({
                findings: result.pathologies.map((p) => ({
                  pathology: p.name, confidence: p.probability, description: getPathologyDescription(p.name),
                })),
                overallRisk: getOverallRisk(result.pathologies),
                imageUrl: url, imageId, analyzedAt: new Date(), source: 'onnx',
              })
            }
          }, 100)
        } else {
          pendingAnalysisRef.current = { imageId, imageUrl: url, result }
        }
      }
    }
  }, [analyze, onImageChange, onAnalysisComplete, assessmentId, heatmaps])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const clearImage = () => {
    setPreview(null); onImageChange(null); onAnalysisComplete(null); setChatHistory([])
  }

  const handleChatUpdate = useCallback((messages: ChatMessage[]) => {
    setChatHistory(messages)
    if (analysis) onAnalysisComplete({ ...analysis, chatHistory: messages })
  }, [analysis, onAnalysisComplete])

  const handleOverride = (findingIndex: number, override: FindingOverride) => {
    if (!analysis) return
    const updatedFindings = analysis.findings.map((finding, idx) => {
      if (idx === findingIndex) {
        const newOverride = finding.override === override ? null : override
        return { ...finding, override: newOverride, adjustedConfidence: newOverride === 'adjust' ? (finding.adjustedConfidence ?? finding.confidence) : undefined }
      }
      return finding
    })
    onAnalysisComplete({ ...analysis, findings: updatedFindings, overallRisk: getOverallRiskWithOverrides(updatedFindings) })
  }

  const handleConfidenceAdjust = (findingIndex: number, newConfidence: number) => {
    if (!analysis) return
    const updatedFindings = analysis.findings.map((finding, idx) =>
      idx === findingIndex ? { ...finding, adjustedConfidence: newConfidence } : finding
    )
    onAnalysisComplete({ ...analysis, findings: updatedFindings, overallRisk: getOverallRiskWithOverrides(updatedFindings) })
  }

  const displayImage = selectedHeatmap
    ? heatmaps.find(h => h.name === selectedHeatmap)?.heatmapDataUrl || preview
    : preview

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={ImageIcon}
        iconColor="text-primary-600"
        title="X-Ray Analysis"
        description="Upload a chest X-ray for AI analysis (optional)"
        variant="compact"
      />

      <ModelSelector
        currentModel={xrayModel}
        onModelChange={setXrayModel}
        lmStudioStatus={lmStudioConnectionStatus}
        onCheckConnection={checkLMStudioConnection}
      />

      {isModelLoading && (
        <Card padding="sm" className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <p className="font-medium text-blue-700 text-sm">Loading X-ray model...</p>
              <p className="text-xs text-blue-600">{modelLoadingProgress}% - First time only</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${modelLoadingProgress}%` }} />
          </div>
        </Card>
      )}

      {!preview && (
        <ImageUploader
          preview={preview}
          isDragging={isDragging}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onFileSelect={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file) }}
          onClear={clearImage}
        />
      )}

      {preview && (
        <div className="space-y-3">
          <ImagePreview src={displayImage || preview} selectedHeatmap={selectedHeatmap} onClear={clearImage} />
          <HeatmapViewer heatmaps={heatmaps} selectedHeatmap={selectedHeatmap} onSelect={setSelectedHeatmap} />

          {isLoading && (
            <Card padding="sm" className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
              <span className="text-sm text-gray-700">Analyzing X-ray...</span>
            </Card>
          )}

          {error && (
            <Card padding="sm" className="bg-red-50 border-red-200">
              <span className="text-sm text-red-700">{error}</span>
            </Card>
          )}

          {analysis && !isLoading && (
            <AnalysisResults
              analysis={analysis}
              heatmaps={heatmaps}
              isDemoMode={isDemoMode}
              selectedHeatmap={selectedHeatmap}
              onHeatmapSelect={setSelectedHeatmap}
              onOverride={handleOverride}
              onConfidenceAdjust={handleConfidenceAdjust}
            />
          )}

          {analysis && analysis.source === 'lmstudio' && !isLoading && (
            <XrayAIChat
              imageBase64={imageBase64}
              initialAnalysis={vlmRawResponse || undefined}
              chatHistory={chatHistory}
              onChatUpdate={handleChatUpdate}
            />
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-500">
        X-ray analysis is optional. Click "Next" to skip.
      </p>
    </div>
  )
}

function getPathologyDescription(name: string): string {
  const descriptions: Record<string, string> = {
    Atelectasis: 'Partial or complete lung collapse',
    Cardiomegaly: 'Enlarged heart',
    Consolidation: 'Lung tissue filled with fluid/pus',
    Edema: 'Fluid accumulation in lungs',
    Effusion: 'Fluid around the lungs',
    Emphysema: 'Damaged air sacs in lungs',
    Fibrosis: 'Scarring of lung tissue',
    Hernia: 'Organ protrusion',
    Infiltration: 'Abnormal substance in lung tissue',
    Mass: 'Abnormal growth',
    Nodule: 'Small growth in lung',
    Pleural_Thickening: 'Thickened pleural lining',
    Pneumonia: 'Lung infection',
    Pneumothorax: 'Collapsed lung',
  }
  return descriptions[name] || ''
}

function getOverallRisk(pathologies: { name: string; probability: number }[]): 'low' | 'moderate' | 'high' | 'critical' {
  const critical = ['Pneumothorax', 'Pneumonia', 'Edema']
  const high = ['Consolidation', 'Effusion', 'Cardiomegaly']
  for (const p of pathologies) {
    if (critical.includes(p.name) && p.probability > 0.5) return 'critical'
    if (high.includes(p.name) && p.probability > 0.5) return 'high'
  }
  const maxProb = Math.max(...pathologies.map((p) => p.probability))
  if (maxProb > 0.7) return 'high'
  if (maxProb > 0.4) return 'moderate'
  return 'low'
}

function getOverallRiskWithOverrides(findings: XrayFinding[]): 'low' | 'moderate' | 'high' | 'critical' {
  const effective = findings.map(f => ({
    name: f.pathology,
    probability: f.override === 'disagree' ? 0 : f.override === 'adjust' && f.adjustedConfidence !== undefined ? f.adjustedConfidence : f.confidence
  }))
  return getOverallRisk(effective)
}

function mapVLMSeverityToRisk(severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical'): 'low' | 'moderate' | 'high' | 'critical' {
  switch (severity) {
    case 'normal': case 'mild': return 'low'
    case 'moderate': return 'moderate'
    case 'severe': return 'high'
    case 'critical': return 'critical'
    default: return 'moderate'
  }
}
