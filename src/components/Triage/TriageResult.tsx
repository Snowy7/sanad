import { useState } from 'react'
import { AlertTriangle, ChevronUp, ChevronDown, Clock, Info } from 'lucide-react'
import { TriageScore, TriagePriority, TRIAGE_COLORS, TRIAGE_LABELS } from '../../types'
import { usePatientStore } from '../../store/patientStore'
import { overrideTriagePriority } from '../../lib/triageEngine'

interface TriageResultProps {
  score: TriageScore
  assessmentId: string
}

export default function TriageResult({ score, assessmentId }: TriageResultProps) {
  const [showFactors, setShowFactors] = useState(false)
  const { updateTriagePriority } = usePatientStore()

  const colors = TRIAGE_COLORS[score.priority]

  const handleOverride = (newPriority: TriagePriority) => {
    if (newPriority === score.priority) return

    const updatedScore = overrideTriagePriority(score, newPriority, 'Clinician')
    updateTriagePriority(assessmentId, updatedScore)
  }

  const getPriorityOrder = (priority: TriagePriority): number => {
    const order: Record<TriagePriority, number> = {
      immediate: 0,
      urgent: 1,
      delayed: 2,
      minimal: 3,
    }
    return order[priority]
  }

  const canUpgrade = getPriorityOrder(score.priority) > 0
  const canDowngrade = getPriorityOrder(score.priority) < 3

  const getNextHigherPriority = (): TriagePriority => {
    const priorities: TriagePriority[] = ['immediate', 'urgent', 'delayed', 'minimal']
    const currentIndex = getPriorityOrder(score.priority)
    return priorities[Math.max(0, currentIndex - 1)]
  }

  const getNextLowerPriority = (): TriagePriority => {
    const priorities: TriagePriority[] = ['immediate', 'urgent', 'delayed', 'minimal']
    const currentIndex = getPriorityOrder(score.priority)
    return priorities[Math.min(3, currentIndex + 1)]
  }

  return (
    <div className="card">
      {/* Priority Badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Triage Assessment</h3>
        {score.overriddenBy && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Info className="w-3 h-3" />
            Overridden by {score.overriddenBy}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div
          className={`flex-1 py-4 rounded-xl text-center ${colors.bg} ${colors.text}`}
        >
          <div className="text-2xl font-bold">
            {TRIAGE_LABELS[score.priority]}
          </div>
          <div className="text-sm opacity-80">Score: {score.score}/100</div>
        </div>
      </div>

      {/* Override Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => canUpgrade && handleOverride(getNextHigherPriority())}
          disabled={!canUpgrade}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            canUpgrade
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronUp className="w-4 h-4" />
          More Urgent
        </button>
        <button
          onClick={() => canDowngrade && handleOverride(getNextLowerPriority())}
          disabled={!canDowngrade}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            canDowngrade
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
          Less Urgent
        </button>
      </div>

      {/* Recommendation */}
      <div className="p-3 bg-gray-50 rounded-lg mb-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">{score.recommendation}</p>
        </div>
      </div>

      {/* Contributing Factors Toggle */}
      <button
        onClick={() => setShowFactors(!showFactors)}
        className="w-full flex items-center justify-between py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span className="font-medium">Contributing Factors</span>
        {showFactors ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Factors List */}
      {showFactors && (
        <div className="mt-2 space-y-2 pt-2 border-t border-gray-100">
          {score.factors
            .filter((f) => f.contribution > 0)
            .map((factor, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-700">{factor.name}</span>
                  <p className="text-xs text-gray-500">{factor.description}</p>
                </div>
                <span
                  className={`font-medium px-2 py-0.5 rounded ${
                    factor.contribution > 15
                      ? 'bg-red-100 text-red-700'
                      : factor.contribution > 8
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  +{Math.round(factor.contribution)}
                </span>
              </div>
            ))}

          {score.factors.filter((f) => f.contribution > 0).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              No significant contributing factors
            </p>
          )}
        </div>
      )}

      {/* Original Priority (if overridden) */}
      {score.originalPriority && score.originalPriority !== score.priority && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>
            Original: {TRIAGE_LABELS[score.originalPriority]} | Overridden{' '}
            {score.overriddenAt &&
              new Date(score.overriddenAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  )
}
