import { useState } from 'react'
import { AlertTriangle, ChevronUp, ChevronDown, Clock, Info } from 'lucide-react'
import { TriageScore, TriagePriority } from '../../types'
import { usePatientStore } from '../../store/patientStore'
import { overrideTriagePriority } from '../../lib/triageEngine'
import { triageColors, triageLabels, triagePriorityOrder } from '../../lib/designTokens'
import { Card } from '../ui'

interface TriageResultProps {
  score: TriageScore
  assessmentId: string
}

export default function TriageResult({ score, assessmentId }: TriageResultProps) {
  const [showFactors, setShowFactors] = useState(false)
  const { updateTriagePriority } = usePatientStore()

  const colors = triageColors[score.priority]

  const handleOverride = async (newPriority: TriagePriority) => {
    if (newPriority === score.priority) return

    const updatedScore = overrideTriagePriority(score, newPriority, 'Clinician')
    try {
      await updateTriagePriority(assessmentId, updatedScore)
    } catch (error) {
      console.error('Failed to update triage priority:', error)
    }
  }

  const currentOrder = triagePriorityOrder[score.priority]
  const canUpgrade = currentOrder > 0
  const canDowngrade = currentOrder < 3

  const getNextHigherPriority = (): TriagePriority => {
    const priorities: TriagePriority[] = ['immediate', 'urgent', 'delayed', 'minimal']
    return priorities[Math.max(0, currentOrder - 1)]
  }

  const getNextLowerPriority = (): TriagePriority => {
    const priorities: TriagePriority[] = ['immediate', 'urgent', 'delayed', 'minimal']
    return priorities[Math.min(3, currentOrder + 1)]
  }

  return (
    <Card padding="md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">Triage Assessment</h3>
        {score.overriddenBy && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Info className="w-3 h-3" />
            Overridden
          </div>
        )}
      </div>

      {/* Priority Badge */}
      <div className={`py-3 rounded-xl text-center mb-3 ${colors.bg} ${colors.text}`}>
        <div className="text-xl font-bold">{triageLabels[score.priority]}</div>
        <div className="text-sm opacity-80">Score: {score.score}/100</div>
      </div>

      {/* Override Buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => canUpgrade && handleOverride(getNextHigherPriority())}
          disabled={!canUpgrade}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            canUpgrade
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronUp className="w-4 h-4" />
          More Urgent
        </button>
        <button
          onClick={() => canDowngrade && handleOverride(getNextLowerPriority())}
          disabled={!canDowngrade}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            canDowngrade
              ? 'bg-green-50 text-green-600 hover:bg-green-100'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
          Less Urgent
        </button>
      </div>

      {/* Recommendation */}
      <div className="p-2.5 bg-amber-50 rounded-lg mb-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{score.recommendation}</p>
        </div>
      </div>

      {/* Contributing Factors Toggle */}
      <button
        onClick={() => setShowFactors(!showFactors)}
        className="w-full flex items-center justify-between py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
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
                  className={`font-medium px-2 py-0.5 rounded text-xs ${
                    factor.contribution > 15
                      ? 'bg-red-50 text-red-600'
                      : factor.contribution > 8
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-gray-100 text-gray-600'
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
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>
            Original: {triageLabels[score.originalPriority]} | Overridden{' '}
            {score.overriddenAt && new Date(score.overriddenAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </Card>
  )
}
