import { AlertCircle, FlaskConical, Flame, Check, XCircle, SlidersHorizontal, Sparkles } from 'lucide-react'
import { XrayAnalysis, XrayFinding, FindingOverride } from '../../../types'
import { Card } from '../../ui'
import { PathologyHeatmap } from '../../../hooks/useXrayAnalysis'

interface AnalysisResultsProps {
  analysis: XrayAnalysis
  heatmaps: PathologyHeatmap[]
  isDemoMode: boolean
  selectedHeatmap: string | null
  onHeatmapSelect: (name: string | null) => void
  onOverride: (index: number, override: FindingOverride) => void
  onConfidenceAdjust: (index: number, confidence: number) => void
}

export default function AnalysisResults({
  analysis,
  heatmaps,
  isDemoMode,
  selectedHeatmap,
  onHeatmapSelect,
  onOverride,
  onConfidenceAdjust,
}: AnalysisResultsProps) {
  const isVLM = analysis.source === 'lmstudio'

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">AI Analysis Results</h3>
        <div className="flex items-center gap-2">
          {isVLM && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
              <Sparkles className="w-3 h-3" />
              Advanced AI
            </span>
          )}
          {heatmaps.length > 0 && !isVLM && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-medium rounded-full">
              <Flame className="w-3 h-3" />
              Heatmaps
            </span>
          )}
          {isDemoMode && !isVLM && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
              <FlaskConical className="w-3 h-3" />
              Demo
            </span>
          )}
        </div>
      </div>

      {/* Overall Risk */}
      <RiskBadge risk={analysis.overallRisk} severity={analysis.vlmAnalysis?.severity} />

      {/* VLM Analysis Display */}
      {isVLM && analysis.vlmAnalysis && (
        <VLMAnalysisDisplay vlm={analysis.vlmAnalysis} />
      )}

      {/* ONNX Findings */}
      {!isVLM && (
        <ONNXFindings
          findings={analysis.findings}
          heatmaps={heatmaps}
          selectedHeatmap={selectedHeatmap}
          onHeatmapSelect={onHeatmapSelect}
          onOverride={onOverride}
          onConfidenceAdjust={onConfidenceAdjust}
        />
      )}

      <p className="text-xs text-gray-500 mt-3">
        {isVLM
          ? 'AI analysis is for decision support only. Clinical judgment required.'
          : isDemoMode
          ? 'Demo mode: Results based on image heuristics.'
          : 'AI analysis is for assistance only. Clinical judgment required.'}
      </p>
    </Card>
  )
}

function RiskBadge({
  risk,
  severity,
}: {
  risk: 'low' | 'moderate' | 'high' | 'critical'
  severity?: string
}) {
  const colors = {
    critical: 'bg-red-50 text-red-700',
    high: 'bg-orange-50 text-orange-700',
    moderate: 'bg-amber-50 text-amber-700',
    low: 'bg-green-50 text-green-700',
  }

  return (
    <div className={`mb-3 p-2.5 rounded-lg ${colors[risk]}`}>
      <span className="font-medium">Overall Risk: </span>
      <span className="capitalize">{risk}</span>
      {severity && (
        <span className="text-xs ml-2">(Severity: {severity})</span>
      )}
    </div>
  )
}

function VLMAnalysisDisplay({ vlm }: { vlm: NonNullable<XrayAnalysis['vlmAnalysis']> }) {
  return (
    <div className="space-y-3">
      {vlm.technique && (
        <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-1">Technique</h4>
          <p className="text-sm text-gray-600">{vlm.technique}</p>
        </div>
      )}

      <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-xs font-medium text-gray-700 mb-1">Findings</h4>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{vlm.findings}</p>
      </div>

      {vlm.impressions.length > 0 && (
        <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-xs font-medium text-blue-700 mb-1.5">Impressions</h4>
          <ul className="list-disc list-inside space-y-0.5">
            {vlm.impressions.map((imp, i) => (
              <li key={i} className="text-sm text-blue-600">{imp}</li>
            ))}
          </ul>
        </div>
      )}

      {vlm.recommendations.length > 0 && (
        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="text-xs font-medium text-amber-700 mb-1.5">Recommendations</h4>
          <ul className="list-disc list-inside space-y-0.5">
            {vlm.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-amber-600">{rec}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-500 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Heatmaps not available with Advanced AI model.
      </p>
    </div>
  )
}

function ONNXFindings({
  findings,
  heatmaps,
  selectedHeatmap,
  onHeatmapSelect,
  onOverride,
  onConfidenceAdjust,
}: {
  findings: XrayFinding[]
  heatmaps: PathologyHeatmap[]
  selectedHeatmap: string | null
  onHeatmapSelect: (name: string | null) => void
  onOverride: (index: number, override: FindingOverride) => void
  onConfidenceAdjust: (index: number, confidence: number) => void
}) {
  return (
    <div className="space-y-2">
      {findings
        .sort((a, b) => b.confidence - a.confidence)
        .map((finding, index) => (
          <FindingCard
            key={index}
            finding={finding}
            index={index}
            hasHeatmap={heatmaps.some(h => h.name === finding.pathology)}
            onHeatmapClick={() => onHeatmapSelect(finding.pathology)}
            onOverride={onOverride}
            onConfidenceAdjust={onConfidenceAdjust}
          />
        ))}
    </div>
  )
}

function FindingCard({
  finding,
  index,
  hasHeatmap,
  onHeatmapClick,
  onOverride,
  onConfidenceAdjust,
}: {
  finding: XrayFinding
  index: number
  hasHeatmap: boolean
  onHeatmapClick: () => void
  onOverride: (index: number, override: FindingOverride) => void
  onConfidenceAdjust: (index: number, confidence: number) => void
}) {
  const effectiveConfidence = finding.override === 'disagree'
    ? 0
    : finding.adjustedConfidence ?? finding.confidence

  const borderColor = finding.override === 'agree' ? 'border-green-200 bg-green-50' :
    finding.override === 'disagree' ? 'border-red-200 bg-red-50' :
    finding.override === 'adjust' ? 'border-blue-200 bg-blue-50' :
    'border-gray-200 bg-gray-50'

  return (
    <div className={`p-2.5 rounded-lg border ${borderColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div
          className={`font-medium text-sm text-gray-800 flex items-center gap-1.5 ${hasHeatmap ? 'cursor-pointer hover:text-primary-600' : ''}`}
          onClick={hasHeatmap ? onHeatmapClick : undefined}
        >
          {finding.pathology}
          {hasHeatmap && <Flame className="w-3 h-3 text-orange-500" />}
          {finding.override && (
            <span className={`text-xs px-1 py-0.5 rounded ${
              finding.override === 'agree' ? 'bg-green-100 text-green-700' :
              finding.override === 'disagree' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {finding.override === 'agree' ? 'Confirmed' :
               finding.override === 'disagree' ? 'Ruled Out' : 'Adjusted'}
            </span>
          )}
        </div>
        <span className={`text-sm font-medium ${
          effectiveConfidence > 0.7 ? 'text-red-600' :
          effectiveConfidence > 0.4 ? 'text-amber-600' : 'text-gray-500'
        }`}>
          {finding.override === 'adjust' && finding.adjustedConfidence !== undefined && (
            <span className="text-gray-400 line-through mr-1 text-xs">
              {Math.round(finding.confidence * 100)}%
            </span>
          )}
          {Math.round(effectiveConfidence * 100)}%
        </span>
      </div>

      {/* Confidence Bar */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all ${
            finding.override === 'disagree' ? 'bg-gray-400' :
            effectiveConfidence > 0.7 ? 'bg-red-500' :
            effectiveConfidence > 0.4 ? 'bg-amber-500' : 'bg-gray-400'
          }`}
          style={{ width: `${Math.round(effectiveConfidence * 100)}%` }}
        />
      </div>

      {/* Override Controls */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Override:</span>
        <OverrideButton
          active={finding.override === 'agree'}
          onClick={() => onOverride(index, 'agree')}
          icon={<Check className="w-3.5 h-3.5" />}
          activeColor="bg-green-500"
          hoverColor="hover:bg-green-100 hover:text-green-600"
        />
        <OverrideButton
          active={finding.override === 'disagree'}
          onClick={() => onOverride(index, 'disagree')}
          icon={<XCircle className="w-3.5 h-3.5" />}
          activeColor="bg-red-500"
          hoverColor="hover:bg-red-100 hover:text-red-600"
        />
        <OverrideButton
          active={finding.override === 'adjust'}
          onClick={() => onOverride(index, 'adjust')}
          icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          activeColor="bg-blue-500"
          hoverColor="hover:bg-blue-100 hover:text-blue-600"
        />

        {finding.override === 'adjust' && (
          <div className="flex-1 flex items-center gap-1.5 ml-1">
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((finding.adjustedConfidence ?? finding.confidence) * 100)}
              onChange={(e) => onConfidenceAdjust(index, parseInt(e.target.value) / 100)}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs text-blue-600 font-medium w-8">
              {Math.round((finding.adjustedConfidence ?? finding.confidence) * 100)}%
            </span>
          </div>
        )}

        {finding.override && (
          <button
            onClick={() => onOverride(index, null)}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

function OverrideButton({
  active,
  onClick,
  icon,
  activeColor,
  hoverColor,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  activeColor: string
  hoverColor: string
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1 rounded transition-colors ${
        active
          ? `${activeColor} text-white`
          : `bg-gray-200 text-gray-500 ${hoverColor}`
      }`}
    >
      {icon}
    </button>
  )
}
