import { useState, useCallback, useRef, useEffect } from 'react'
import { ImageIcon, Upload, X, Loader2, AlertCircle, FlaskConical, Flame, Check, XCircle, SlidersHorizontal } from 'lucide-react'
import { XrayAnalysis, XrayFinding, FindingOverride, PersistedHeatmap } from '../../types'
import { useXrayAnalysis, PathologyHeatmap } from '../../hooks/useXrayAnalysis'
import { saveHeatmap, saveXrayImage } from '../../store/patientStore'

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
    setSelectedHeatmap
  } = useXrayAnalysis()

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

      const result = await analyze(file)
      if (result) {
        // Create a temporary assessment ID for new assessments
        const tempId = assessmentId || `temp-${crypto.randomUUID()}`
        tempAssessmentIdRef.current = tempId

        // Save original X-ray image to IndexedDB
        const imageId = await saveXrayImage(tempId, file)

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
              })
            }
          }, 100)
        } else {
          // Heatmaps already available, let useEffect handle it
          pendingAnalysisRef.current = { imageId, imageUrl: url, result }
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
          <ImageIcon className="w-6 h-6 text-primary-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">X-Ray Analysis</h2>
          <p className="text-sm text-gray-500">
            Upload a chest X-ray for AI analysis (optional)
          </p>
        </div>
      </div>

      {/* Model Loading State */}
      {isModelLoading && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <p className="font-medium text-blue-800">Loading X-ray model...</p>
              <p className="text-sm text-blue-600">
                {modelLoadingProgress}% - This only happens once
              </p>
            </div>
          </div>
          <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
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
              className="w-full bg-gray-900 object-contain max-h-80"
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
                <Flame className="w-5 h-5 text-orange-600" />
                <h4 className="font-semibold text-orange-900">Suspect Area Heatmaps</h4>
              </div>
              <p className="text-sm text-orange-700 mb-3">
                Click a pathology to see where the AI suspects it may be located:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedHeatmap(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    !selectedHeatmap
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
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
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-orange-700 hover:bg-orange-100 border border-orange-300'
                    }`}
                  >
                    {heatmap.name} ({Math.round(heatmap.probability * 100)}%)
                  </button>
                ))}
              </div>
              <p className="text-xs text-orange-600 mt-3">
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
                  {heatmaps.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      <Flame className="w-3 h-3" />
                      Heatmaps Available
                    </span>
                  )}
                  {isDemoMode && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
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
                    ? 'bg-red-100 text-red-800'
                    : analysis.overallRisk === 'high'
                    ? 'bg-orange-100 text-orange-800'
                    : analysis.overallRisk === 'moderate'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                <span className="font-medium">Overall Risk: </span>
                <span className="capitalize">{analysis.overallRisk}</span>
              </div>

              {/* Findings - show all pathologies sorted by confidence with override controls */}
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
                          finding.override === 'agree' ? 'border-green-300 bg-green-50' :
                          finding.override === 'disagree' ? 'border-red-300 bg-red-50' :
                          finding.override === 'adjust' ? 'border-blue-300 bg-blue-50' :
                          'border-gray-200 bg-white'
                        }`}
                      >
                        {/* Finding Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`font-medium text-gray-700 flex items-center gap-2 ${hasHeatmap ? 'cursor-pointer hover:text-primary-600' : ''}`}
                            onClick={() => hasHeatmap && setSelectedHeatmap(finding.pathology)}
                          >
                            {finding.pathology}
                            {hasHeatmap && (
                              <Flame className="w-3 h-3 text-orange-500" />
                            )}
                            {finding.override && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                finding.override === 'agree' ? 'bg-green-200 text-green-800' :
                                finding.override === 'disagree' ? 'bg-red-200 text-red-800' :
                                'bg-blue-200 text-blue-800'
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
                              finding.override === 'disagree' ? 'bg-gray-300' :
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
                                : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'
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
                                : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
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
                                : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
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
                              className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>

              <p className="text-xs text-gray-500 mt-4">
                {isDemoMode
                  ? 'Demo mode: Results based on image analysis heuristics, not a trained model.'
                  : 'AI analysis is for assistance only. Clinical judgment required.'}
              </p>
            </div>
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
