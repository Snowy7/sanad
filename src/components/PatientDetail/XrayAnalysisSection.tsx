import { useState } from 'react'
import { Flame, Check, XCircle, SlidersHorizontal, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { XrayAnalysis, XrayFinding } from '../../types'
import { useHeatmapLoader } from '../../hooks/useHeatmapLoader'

interface XrayAnalysisSectionProps {
  analysis: XrayAnalysis
  assessmentId: string
}

export default function XrayAnalysisSection({ analysis, assessmentId }: XrayAnalysisSectionProps) {
  const { heatmaps, selectedHeatmap, setSelectedHeatmap } = useHeatmapLoader(
    assessmentId,
    analysis.heatmaps
  )
  const [showAllFindings, setShowAllFindings] = useState(false)

  // Get the display image (original or heatmap overlay)
  const displayImage = selectedHeatmap
    ? heatmaps.find(h => h.pathology === selectedHeatmap)?.dataUrl || analysis.imageUrl
    : analysis.imageUrl

  // Separate findings into significant (>10%) and low probability
  const significantFindings = analysis.findings.filter(f => {
    const effectiveConf = getEffectiveConfidence(f)
    return effectiveConf > 0.1 || f.override
  }).sort((a, b) => getEffectiveConfidence(b) - getEffectiveConfidence(a))

  const lowFindings = analysis.findings.filter(f => {
    const effectiveConf = getEffectiveConfidence(f)
    return effectiveConf <= 0.1 && !f.override
  }).sort((a, b) => getEffectiveConfidence(b) - getEffectiveConfidence(a))

  const displayedFindings = showAllFindings
    ? [...significantFindings, ...lowFindings]
    : significantFindings

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ImageIcon className="w-5 h-5" />
        X-Ray Analysis
      </h3>

      {/* Image with heatmap overlay */}
      <div className="relative mb-4">
        <img
          src={displayImage}
          alt="Chest X-ray"
          className="w-full rounded-lg bg-gray-900"
        />
        {selectedHeatmap && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            {selectedHeatmap}
          </div>
        )}
      </div>

      {/* Heatmap toggle buttons */}
      {heatmaps.length > 0 && (
        <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Heatmap Views</span>
          </div>
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
                key={heatmap.pathology}
                onClick={() => setSelectedHeatmap(heatmap.pathology)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedHeatmap === heatmap.pathology
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-orange-700 hover:bg-orange-100 border border-orange-300'
                }`}
              >
                {heatmap.pathology} ({Math.round(heatmap.probability * 100)}%)
              </button>
            ))}
          </div>
          <p className="text-xs text-orange-600 mt-2">
            Red/orange = higher suspicion, Blue/green = lower suspicion
          </p>
        </div>
      )}

      {/* Overall Risk Badge */}
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

      {/* Findings Comparison */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Findings Comparison</h4>

        {displayedFindings.map((finding, index) => (
          <FindingComparisonCard key={index} finding={finding} />
        ))}

        {/* Show more/less toggle */}
        {lowFindings.length > 0 && (
          <button
            onClick={() => setShowAllFindings(!showAllFindings)}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
          >
            {showAllFindings ? (
              <>
                Show less <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Show {lowFindings.length} more findings <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Helper to get effective confidence considering overrides
function getEffectiveConfidence(finding: XrayFinding): number {
  if (finding.override === 'disagree') return 0
  if (finding.override === 'adjust' && finding.adjustedConfidence !== undefined) {
    return finding.adjustedConfidence
  }
  return finding.confidence
}

// Finding comparison card component
function FindingComparisonCard({ finding }: { finding: XrayFinding }) {
  const effectiveConfidence = getEffectiveConfidence(finding)
  const wasModified = finding.override && (
    finding.override === 'disagree' ||
    (finding.override === 'adjust' && finding.adjustedConfidence !== finding.confidence)
  )
  const confidenceDiff = finding.adjustedConfidence !== undefined
    ? finding.adjustedConfidence - finding.confidence
    : 0

  return (
    <div
      className={`p-3 rounded-lg border ${
        finding.override === 'agree'
          ? 'border-green-200 bg-green-50'
          : finding.override === 'disagree'
          ? 'border-red-200 bg-red-50'
          : finding.override === 'adjust'
          ? 'border-blue-200 bg-blue-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Header with pathology name and badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-800">{finding.pathology}</span>
        <OverrideBadge override={finding.override} />
      </div>

      {/* AI Confidence Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">AI Confidence</span>
          <span className={`font-medium ${getConfidenceColor(finding.confidence)}`}>
            {Math.round(finding.confidence * 100)}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              finding.confidence > 0.7
                ? 'bg-red-400'
                : finding.confidence > 0.4
                ? 'bg-amber-400'
                : 'bg-gray-400'
            }`}
            style={{ width: `${Math.round(finding.confidence * 100)}%` }}
          />
        </div>
      </div>

      {/* Medic Assessment (if overridden) */}
      {finding.override && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Medic Assessment</span>
            <span className={`font-medium ${getConfidenceColor(effectiveConfidence)}`}>
              {finding.override === 'agree' && (
                <span className="text-green-600">Agreed</span>
              )}
              {finding.override === 'disagree' && (
                <span className="text-red-600">Ruled Out</span>
              )}
              {finding.override === 'adjust' && (
                <>
                  {Math.round(effectiveConfidence * 100)}%
                  {confidenceDiff !== 0 && (
                    <span className={confidenceDiff > 0 ? 'text-red-500' : 'text-green-500'}>
                      {' '}({confidenceDiff > 0 ? '+' : ''}{Math.round(confidenceDiff * 100)}%)
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
          {finding.override !== 'agree' && (
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  finding.override === 'disagree'
                    ? 'bg-gray-300'
                    : effectiveConfidence > 0.7
                    ? 'bg-red-500'
                    : effectiveConfidence > 0.4
                    ? 'bg-amber-500'
                    : 'bg-gray-400'
                }`}
                style={{ width: `${Math.round(effectiveConfidence * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Override note if present */}
      {finding.overrideNote && (
        <p className="text-xs text-gray-600 mt-2 italic">
          Note: {finding.overrideNote}
        </p>
      )}
    </div>
  )
}

// Override badge component
function OverrideBadge({ override }: { override: XrayFinding['override'] }) {
  if (!override) return null

  const config = {
    agree: {
      icon: Check,
      label: 'Confirmed',
      className: 'bg-green-100 text-green-700 border-green-200',
    },
    disagree: {
      icon: XCircle,
      label: 'Ruled Out',
      className: 'bg-red-100 text-red-700 border-red-200',
    },
    adjust: {
      icon: SlidersHorizontal,
      label: 'Adjusted',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
  }

  const { icon: Icon, label, className } = config[override]

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

// Helper for confidence text color
function getConfidenceColor(confidence: number): string {
  if (confidence > 0.7) return 'text-red-600'
  if (confidence > 0.4) return 'text-amber-600'
  return 'text-gray-500'
}
