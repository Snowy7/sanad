import { useState, useCallback, useRef, useEffect } from 'react'
import { ImageIcon, Upload, X, Loader2, AlertCircle, FlaskConical, Flame, Check, XCircle, SlidersHorizontal, Wifi, WifiOff, Sparkles, Cpu } from 'lucide-react'
import { XrayAnalysis, XrayFinding, FindingOverride, PersistedHeatmap, ChatMessage } from '../../types'
import { useXrayAnalysis, PathologyHeatmap } from '../../hooks/useXrayAnalysis'
import { saveHeatmap, saveXrayImage } from '../../store/patientStore'
import { useSettingsStore } from '../../store/settingsStore'
import XrayAIChat from './XrayAIChat'

// Helper to convert data URL to Blob
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

// Helper to persist heatmaps to IndexedDB
async function persistHeatmaps(
  assessmentId: string,
  heatmaps: PathologyHeatmap[]
): Promise<PersistedHeatmap[]> {
  const persisted: PersistedHeatmap[] = []

  for (const heatmap of heatmaps) {
    const blob = await dataUrlToBlob(heatmap.heatmapDataUrl)
    const heatmapImageId = await saveHeatmap(
      assessmentId,
      heatmap.name,
      heatmap.probability,
      blob
    )
    persisted.push({
      pathology: heatmap.name,
      probability: heatmap.probability,
      heatmapImageId,
    })
  }

  return persisted
}

interface XrayUploadProps {
  image: File | null
  analysis: XrayAnalysis | null
  onImageChange: (image: File | null) => void
  onAnalysisComplete: (analysis: XrayAnalysis | null) => void
  assessmentId?: string  // Needed for persisting heatmaps
}

export default function XrayUpload({
  image: _image,
  analysis,
  onImageChange,
  onAnalysisComplete,
  assessmentId,
}: XrayUploadProps) {
  const [preview, setPreview] = useState<string | null>(
    analysis?.imageUrl || null
  )
  const [isDragging, setIsDragging] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(analysis?.chatHistory || [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    analyze,
    isLoading,
    error,
    isModelLoading,
    modelLoadingProgress,
    isDemoMode,
    heatmaps,
    selectedHeatmap,
    setSelectedHeatmap,
    currentModel,
    isLMStudioAvailable,
    lmStudioConnectionStatus,
    vlmAnalysis,
    vlmRawResponse,
    checkLMStudioConnection,
    imageBase64,
  } = useXrayAnalysis()

  const { xrayModel, setXrayModel } = useSettingsStore()

  // Track the current temp ID for heatmap persistence
  const tempAssessmentIdRef = useRef<string | null>(null)
  const pendingAnalysisRef = useRef<{
    imageId: string
    imageUrl: string
    result: { pathologies: { name: string; probability: number }[] }
  } | null>(null)

  // Effect to persist heatmaps when they become available
  useEffect(() => {
    const persistAndComplete = async () => {
      if (heatmaps.length > 0 && pendingAnalysisRef.current && tempAssessmentIdRef.current) {
        const { imageId, imageUrl, result } = pendingAnalysisRef.current
        const tempId = tempAssessmentIdRef.current

        // Persist heatmaps to IndexedDB
        const persistedHeatmaps = await persistHeatmaps(tempId, heatmaps)

        onAnalysisComplete({
          findings: result.pathologies.map((p) => ({
            pathology: p.name,
            confidence: p.probability,
            description: getPathologyDescription(p.name),
          })),
          overallRisk: getOverallRisk(result.pathologies),
          imageUrl,
          imageId,
          heatmaps: persistedHeatmaps,
          analyzedAt: new Date(),
        })

        // Clear pending data
        pendingAnalysisRef.current = null
        tempAssessmentIdRef.current = null
      }
    }

    persistAndComplete()
  }, [heatmaps, onAnalysisComplete])

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }

      const url = URL.createObjectURL(file)
      setPreview(url)
      onImageChange(file)
      setChatHistory([]) // Reset chat history for new image

      const result = await analyze(file)
      if (result) {
        // Create a temporary assessment ID for new assessments
        const tempId = assessmentId || `temp-${crypto.randomUUID()}`
        tempAssessmentIdRef.current = tempId

        // Save original X-ray image to IndexedDB
        const imageId = await saveXrayImage(tempId, file)

        // Check if this is a VLM result
        if (result.source === 'lmstudio' && result.vlmResult) {
          // VLM analysis - complete immediately with VLM-specific data
          const vlmRisk = mapVLMSeverityToRisk(result.vlmResult.severity)
          onAnalysisComplete({
            findings: result.pathologies.map((p) => ({
              pathology: p.name,
              confidence: p.probability,
              description: getPathologyDescription(p.name),
            })),
            overallRisk: vlmRisk,
            imageUrl: url,
            imageId,
            analyzedAt: new Date(),
            source: 'lmstudio',
            vlmAnalysis: result.vlmResult,
          })
        } else {
          // ONNX analysis - handle heatmaps
          // If CAM model generated heatmaps, wait for useEffect to persist them
          // Otherwise complete immediately (demo mode or no CAM model)
          if (heatmaps.length === 0) {
            // No heatmaps expected, or demo mode - wait a bit and check again
            setTimeout(async () => {
              if (heatmaps.length > 0) {
                // Heatmaps arrived, let useEffect handle it
                pendingAnalysisRef.current = { imageId, imageUrl: url, result }
              } else {
                // No heatmaps, complete immediately
                onAnalysisComplete({
                  findings: result.pathologies.map((p) => ({
                    pathology: p.name,
                    confidence: p.probability,
                    description: getPathologyDescription(p.name),
                  })),
                  overallRisk: getOverallRisk(result.pathologies),
                  imageUrl: url,
                  imageId,
                  analyzedAt: new Date(),
                  source: 'onnx',
                })
              }
            }, 100)
          } else {
            // Heatmaps already available, let useEffect handle it
            pendingAnalysisRef.current = { imageId, imageUrl: url, result }
          }
        }
      }
    },
    [analyze, onImageChange, onAnalysisComplete, assessmentId, heatmaps]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const clearImage = () => {
    setPreview(null)
    onImageChange(null)
    onAnalysisComplete(null)
    setChatHistory([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle chat updates - persist to analysis
  const handleChatUpdate = useCallback((messages: ChatMessage[]) => {
    setChatHistory(messages)
    if (analysis) {
      onAnalysisComplete({
        ...analysis,
        chatHistory: messages,
      })
    }
  }, [analysis, onAnalysisComplete])

  // Handle medic override of AI findings
  const handleOverride = (findingIndex: number, override: FindingOverride) => {
    if (!analysis) return

    const updatedFindings = analysis.findings.map((finding, idx) => {
      if (idx === findingIndex) {
        // Toggle off if clicking the same override
        const newOverride = finding.override === override ? null : override
        return {
          ...finding,
          override: newOverride,
          // Reset adjusted confidence if not adjusting
          adjustedConfidence: newOverride === 'adjust' ? (finding.adjustedConfidence ?? finding.confidence) : undefined
        }
      }
      return finding
    })

    // Recalculate overall risk based on overrides
    const newRisk = getOverallRiskWithOverrides(updatedFindings)

    onAnalysisComplete({
      ...analysis,
      findings: updatedFindings,
      overallRisk: newRisk
    })
  }

  // Handle confidence adjustment
  const handleConfidenceAdjust = (findingIndex: number, newConfidence: number) => {
    if (!analysis) return

    const updatedFindings = analysis.findings.map((finding, idx) => {
      if (idx === findingIndex) {
        return {
          ...finding,
          adjustedConfidence: newConfidence
        }
      }
      return finding
    })

    // Recalculate overall risk based on overrides
    const newRisk = getOverallRiskWithOverrides(updatedFindings)

    onAnalysisComplete({
      ...analysis,
      findings: updatedFindings,
      overallRisk: newRisk
    })
  }

  // Get the heatmap image to display
  const displayImage = selectedHeatmap
    ? heatmaps.find(h => h.name === selectedHeatmap)?.heatmapDataUrl || preview
    : preview

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary-100 p-3 rounded-xl">
          <ImageIcon className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">X-Ray Analysis</h2>
          <p className="text-sm text-gray-500">
            Upload a chest X-ray for AI analysis (optional)
          </p>
        </div>
      </div>

      {/* Model Selector */}
      <div className="card bg-gray-50 border-gray-200 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-700">Analysis Model</h4>
          {xrayModel === 'lmstudio' && (
            <button
              onClick={() => checkLMStudioConnection()}
              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              disabled={lmStudioConnectionStatus === 'checking'}
            >
              {lmStudioConnectionStatus === 'checking' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : lmStudioConnectionStatus === 'connected' ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              {lmStudioConnectionStatus === 'checking' ? 'Checking...' :
               lmStudioConnectionStatus === 'connected' ? 'Connected' : 'Check Connection'}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setXrayModel('onnx')}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              xrayModel === 'onnx'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-primary-600" />
              <span className="font-medium text-gray-800">Chest X-ray Model</span>
            </div>
            <p className="text-xs text-gray-500 text-left">
              Fast local inference, 18 pathologies, CAM heatmaps, works offline
            </p>
          </button>
          <button
            onClick={() => setXrayModel('lmstudio')}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              xrayModel === 'lmstudio'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-gray-800">Advanced Radiology AI</span>
              {lmStudioConnectionStatus === 'connected' && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Online</span>
              )}
            </div>
            <p className="text-xs text-gray-500 text-left">
              Detailed text analysis, clinical recommendations, interactive Q&A
            </p>
          </button>
        </div>
        {xrayModel === 'lmstudio' && lmStudioConnectionStatus !== 'connected' && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            LM Studio server required. Configure in Settings if not connected.
          </p>
        )}
      </div>

      {/* Model Loading State */}
      {isModelLoading && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <p className="font-medium text-blue-700">Loading X-ray model...</p>
              <p className="text-sm text-blue-600">
                {modelLoadingProgress}% - This only happens once
              </p>
            </div>
          </div>
          <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${modelLoadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!preview && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`card border-2 border-dashed cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          <div className="flex flex-col items-center py-8">
            <Upload
              className={`w-12 h-12 mb-4 ${
                isDragging ? 'text-primary-600' : 'text-gray-400'
              }`}
            />
            <p className="font-medium text-gray-700 mb-1">Drop X-ray image here</p>
            <p className="text-sm text-gray-500">or click to browse</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Preview and Results */}
      {preview && (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="card p-0 overflow-hidden relative">
            <div className="absolute top-2 right-2 flex gap-2 z-10">
              <button
                onClick={clearImage}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <img
              src={displayImage || preview}
              alt="X-ray preview"
              className="w-full bg-slate-900 object-contain max-h-80"
            />

            {/* Heatmap indicator */}
            {selectedHeatmap && (
              <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Showing: {selectedHeatmap}
              </div>
            )}
          </div>

          {/* Heatmap Selector */}
          {heatmaps.length > 0 && (
            <div className="card bg-orange-50 border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-orange-500" />
                <h4 className="font-semibold text-orange-700">Suspect Area Heatmaps</h4>
              </div>
              <p className="text-sm text-orange-600 mb-3">
                Click a pathology to see where the AI suspects it may be located:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedHeatmap(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    !selectedHeatmap
                      ? 'bg-gray-200 text-gray-800'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Original
                </button>
                {heatmaps.map((heatmap) => (
                  <button
                    key={heatmap.name}
                    onClick={() => setSelectedHeatmap(heatmap.name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedHeatmap === heatmap.name
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-orange-600 hover:bg-orange-100 border border-orange-200'
                    }`}
                  >
                    {heatmap.name} ({Math.round(heatmap.probability * 100)}%)
                  </button>
                ))}
              </div>
              <p className="text-xs text-orange-500 mt-3">
                Red/orange areas = higher suspicion. Blue/green = lower suspicion.
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="card flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
              <span className="text-gray-700">Analyzing X-ray...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="card bg-red-50 border-red-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && !isLoading && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">AI Analysis Results</h3>
                <div className="flex items-center gap-2">
                  {analysis.source === 'lmstudio' && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Advanced AI
                    </span>
                  )}
                  {heatmaps.length > 0 && analysis.source !== 'lmstudio' && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-600 text-xs font-medium rounded-full">
                      <Flame className="w-3 h-3" />
                      Heatmaps Available
                    </span>
                  )}
                  {isDemoMode && analysis.source !== 'lmstudio' && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
                      <FlaskConical className="w-3 h-3" />
                      Demo Mode
                    </span>
                  )}
                </div>
              </div>

              {/* Overall Risk */}
              <div
                className={`mb-4 p-3 rounded-lg ${
                  analysis.overallRisk === 'critical'
                    ? 'bg-red-50 text-red-700'
                    : analysis.overallRisk === 'high'
                    ? 'bg-orange-50 text-orange-700'
                    : analysis.overallRisk === 'moderate'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                <span className="font-medium">Overall Risk: </span>
                <span className="capitalize">{analysis.overallRisk}</span>
                {analysis.vlmAnalysis?.severity && (
                  <span className="text-xs ml-2">
                    (Severity: {analysis.vlmAnalysis.severity})
                  </span>
                )}
              </div>

              {/* VLM Analysis Display */}
              {analysis.source === 'lmstudio' && analysis.vlmAnalysis && (
                <div className="space-y-4">
                  {/* Technique */}
                  {analysis.vlmAnalysis.technique && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Technique</h4>
                      <p className="text-sm text-gray-600">{analysis.vlmAnalysis.technique}</p>
                    </div>
                  )}

                  {/* Findings */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Findings</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{analysis.vlmAnalysis.findings}</p>
                  </div>

                  {/* Impressions */}
                  {analysis.vlmAnalysis.impressions.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-700 mb-2">Impressions</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {analysis.vlmAnalysis.impressions.map((impression, i) => (
                          <li key={i} className="text-sm text-blue-600">{impression}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.vlmAnalysis.recommendations.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <h4 className="text-sm font-medium text-amber-700 mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {analysis.vlmAnalysis.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-amber-600">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Heatmaps not available with Advanced AI model.
                  </p>
                </div>
              )}

              {/* ONNX Findings - show all pathologies sorted by confidence with override controls */}
              {analysis.source !== 'lmstudio' && (
                <div className="space-y-3">
                  {analysis.findings
                    .sort((a, b) => b.confidence - a.confidence)
                    .map((finding, index) => {
                      const hasHeatmap = heatmaps.some(h => h.name === finding.pathology)
                      const effectiveConfidence = finding.override === 'disagree'
                        ? 0
                        : finding.adjustedConfidence ?? finding.confidence

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            finding.override === 'agree' ? 'border-green-200 bg-green-50' :
                            finding.override === 'disagree' ? 'border-red-200 bg-red-50' :
                            finding.override === 'adjust' ? 'border-blue-200 bg-blue-50' :
                            'border-gray-200 bg-gray-50'
                          }`}
                        >
                          {/* Finding Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div
                              className={`font-medium text-gray-800 flex items-center gap-2 ${hasHeatmap ? 'cursor-pointer hover:text-primary-600' : ''}`}
                              onClick={() => hasHeatmap && setSelectedHeatmap(finding.pathology)}
                            >
                              {finding.pathology}
                              {hasHeatmap && (
                                <Flame className="w-3 h-3 text-orange-500" />
                              )}
                              {finding.override && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  finding.override === 'agree' ? 'bg-green-100 text-green-700' :
                                  finding.override === 'disagree' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {finding.override === 'agree' ? 'Confirmed' :
                                   finding.override === 'disagree' ? 'Ruled Out' : 'Adjusted'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  effectiveConfidence > 0.7
                                    ? 'text-red-600'
                                    : effectiveConfidence > 0.4
                                    ? 'text-amber-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {finding.override === 'adjust' && finding.adjustedConfidence !== undefined && (
                                  <span className="text-gray-400 line-through mr-1">
                                    {Math.round(finding.confidence * 100)}%
                                  </span>
                                )}
                                {Math.round(effectiveConfidence * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* Confidence Bar */}
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                            <div
                              className={`h-full transition-all ${
                                finding.override === 'disagree' ? 'bg-gray-400' :
                                effectiveConfidence > 0.7 ? 'bg-red-500' :
                                effectiveConfidence > 0.4 ? 'bg-amber-500' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${Math.round(effectiveConfidence * 100)}%` }}
                            />
                          </div>

                          {/* Override Controls */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 mr-1">Override:</span>
                            <button
                              onClick={() => handleOverride(index, 'agree')}
                              className={`p-1.5 rounded-lg transition-colors ${
                                finding.override === 'agree'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-500 hover:bg-green-100 hover:text-green-600'
                              }`}
                              title="Agree with AI finding"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOverride(index, 'disagree')}
                              className={`p-1.5 rounded-lg transition-colors ${
                                finding.override === 'disagree'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-600'
                              }`}
                              title="Disagree / Rule out"
                            >
                              <XCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOverride(index, 'adjust')}
                            className={`p-1.5 rounded-lg transition-colors ${
                              finding.override === 'adjust'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-500 hover:bg-blue-100 hover:text-blue-600'
                            }`}
                            title="Adjust confidence"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>

                          {/* Confidence Slider (shown when adjust is selected) */}
                          {finding.override === 'adjust' && (
                            <div className="flex-1 flex items-center gap-2 ml-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round((finding.adjustedConfidence ?? finding.confidence) * 100)}
                                onChange={(e) => handleConfidenceAdjust(index, parseInt(e.target.value) / 100)}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                              />
                              <span className="text-xs text-blue-600 font-medium w-10">
                                {Math.round((finding.adjustedConfidence ?? finding.confidence) * 100)}%
                              </span>
                            </div>
                          )}

                          {/* Clear override button */}
                          {finding.override && (
                            <button
                              onClick={() => handleOverride(index, null)}
                              className="ml-auto text-xs text-gray-500 hover:text-gray-700"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4">
                {analysis.source === 'lmstudio'
                  ? 'AI analysis is for decision support only. Clinical correlation and physician judgment are essential.'
                  : isDemoMode
                  ? 'Demo mode: Results based on image analysis heuristics, not a trained model.'
                  : 'AI analysis is for assistance only. Clinical judgment required.'}
              </p>
            </div>
          )}

          {/* AI Chat - only for LM Studio analysis */}
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

      {/* Skip Note */}
      <p className="text-center text-sm text-gray-500">
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

function getOverallRisk(
  pathologies: { name: string; probability: number }[]
): 'low' | 'moderate' | 'high' | 'critical' {
  const criticalPathologies = ['Pneumothorax', 'Pneumonia', 'Edema']
  const highPathologies = ['Consolidation', 'Effusion', 'Cardiomegaly']

  for (const p of pathologies) {
    if (criticalPathologies.includes(p.name) && p.probability > 0.5) {
      return 'critical'
    }
    if (highPathologies.includes(p.name) && p.probability > 0.5) {
      return 'high'
    }
  }

  const maxProb = Math.max(...pathologies.map((p) => p.probability))
  if (maxProb > 0.7) return 'high'
  if (maxProb > 0.4) return 'moderate'
  return 'low'
}

// Calculate risk considering medic overrides
function getOverallRiskWithOverrides(
  findings: XrayFinding[]
): 'low' | 'moderate' | 'high' | 'critical' {
  const criticalPathologies = ['Pneumothorax', 'Pneumonia', 'Edema']
  const highPathologies = ['Consolidation', 'Effusion', 'Cardiomegaly']

  // Get effective probabilities considering overrides
  const effectiveFindings = findings.map(f => ({
    name: f.pathology,
    probability: f.override === 'disagree' ? 0 :
                 f.override === 'adjust' && f.adjustedConfidence !== undefined ? f.adjustedConfidence :
                 f.confidence
  }))

  for (const p of effectiveFindings) {
    if (criticalPathologies.includes(p.name) && p.probability > 0.5) {
      return 'critical'
    }
    if (highPathologies.includes(p.name) && p.probability > 0.5) {
      return 'high'
    }
  }

  const maxProb = Math.max(...effectiveFindings.map((p) => p.probability), 0)
  if (maxProb > 0.7) return 'high'
  if (maxProb > 0.4) return 'moderate'
  return 'low'
}

// Map VLM severity to risk level
function mapVLMSeverityToRisk(
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical'
): 'low' | 'moderate' | 'high' | 'critical' {
  switch (severity) {
    case 'normal':
    case 'mild':
      return 'low'
    case 'moderate':
      return 'moderate'
    case 'severe':
      return 'high'
    case 'critical':
      return 'critical'
    default:
      return 'moderate'
  }
}
