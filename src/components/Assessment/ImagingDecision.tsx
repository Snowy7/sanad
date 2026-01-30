import { useMemo, useState } from 'react'
import {
  Scan,
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Edit2
} from 'lucide-react'
import {
  Vitals,
  Symptom,
  ImagingRequest,
  ImagingUrgency,
  ImagingType,
  BodyRegion,
  IMAGING_URGENCY_COLORS,
  IMAGING_URGENCY_LABELS,
  SYMPTOMS_LIST,
} from '../../types'
import { calculateImagingUrgency, createImagingRequest } from '../../lib/imagingUrgencyEngine'

interface ImagingDecisionProps {
  vitals: Vitals
  selectedSymptoms: string[]
  imagingRequest?: ImagingRequest
  onImagingDecision: (request: ImagingRequest | undefined, skipImaging: boolean) => void
}

const IMAGING_TYPE_LABELS: Record<ImagingType, string> = {
  xray: 'X-Ray',
  ultrasound: 'Ultrasound',
  both: 'X-Ray + Ultrasound',
}

const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  chest: 'Chest',
  abdomen: 'Abdomen',
  extremity: 'Extremity',
  head: 'Head',
  spine: 'Spine',
  multiple: 'Multiple Regions',
}

export default function ImagingDecision({
  vitals,
  selectedSymptoms,
  imagingRequest,
  onImagingDecision,
}: ImagingDecisionProps) {
  const [showFactors, setShowFactors] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUrgency, setEditedUrgency] = useState<ImagingUrgency | null>(null)
  const [editedType, setEditedType] = useState<ImagingType | null>(null)
  const [editedRegion, setEditedRegion] = useState<BodyRegion | null>(null)

  // Build symptoms array from selected IDs
  const symptoms: Symptom[] = useMemo(() => {
    return SYMPTOMS_LIST.map(s => ({
      ...s,
      selected: selectedSymptoms.includes(s.id),
    }))
  }, [selectedSymptoms])

  // Calculate imaging urgency
  const urgencyResult = useMemo(() => {
    return calculateImagingUrgency({ vitals, symptoms })
  }, [vitals, symptoms])

  // Current effective values (from saved request or calculated)
  const currentUrgency = imagingRequest?.urgency ?? urgencyResult.urgency
  const currentType = imagingRequest?.imagingType ?? urgencyResult.recommendedImagingType
  const currentRegion = imagingRequest?.bodyRegion ?? urgencyResult.recommendedBodyRegion
  const urgencyColors = IMAGING_URGENCY_COLORS[currentUrgency]

  const handleAccept = () => {
    const request = createImagingRequest(urgencyResult)
    onImagingDecision(request, request.status === 'not-needed')
  }

  const handleSkipImaging = () => {
    const request = createImagingRequest(urgencyResult, { urgency: 'not-required' })
    onImagingDecision(request, true)
  }

  const handleSaveEdit = () => {
    const request = createImagingRequest(urgencyResult, {
      urgency: editedUrgency ?? currentUrgency,
      imagingType: editedType ?? currentType,
      bodyRegion: editedRegion ?? currentRegion,
    })
    onImagingDecision(request, request.status === 'not-needed')
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedUrgency(null)
    setEditedType(null)
    setEditedRegion(null)
    setIsEditing(false)
  }

  return (
    <div className="space-y-6" data-onboarding="imaging-decision-panel">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Scan className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Imaging Decision</h2>
        <p className="text-gray-600 mt-1">
          AI-calculated imaging priority based on vitals and symptoms
        </p>
      </div>

      {/* Urgency Badge */}
      <div className="card text-center">
        <div className="mb-4">
          <span
            className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold ${urgencyColors.bg} ${urgencyColors.text}`}
          >
            {currentUrgency === 'critical' && <AlertTriangle className="w-5 h-5 mr-2" />}
            {IMAGING_URGENCY_LABELS[currentUrgency]}
          </span>
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {urgencyResult.urgencyScore}
        </div>
        <div className="text-sm text-gray-500">Imaging Urgency Score</div>
      </div>

      {/* Recommended Imaging */}
      {!isEditing ? (
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recommended Imaging</h3>
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
            >
              <Edit2 className="w-4 h-4" />
              Modify
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Type</div>
              <div className="font-medium text-gray-900">
                {IMAGING_TYPE_LABELS[currentType]}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Body Region</div>
              <div className="font-medium text-gray-900">
                {BODY_REGION_LABELS[currentRegion]}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Clinical Indication</div>
            <div className="text-gray-700">{urgencyResult.clinicalIndication}</div>
          </div>
        </div>
      ) : (
        <div className="card border-primary-200 bg-primary-50">
          <h3 className="font-semibold text-gray-900 mb-4">Modify Recommendation</h3>

          {/* Urgency Override */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['critical', 'high', 'routine', 'not-required'] as ImagingUrgency[]).map((level) => {
                const colors = IMAGING_URGENCY_COLORS[level]
                const isSelected = (editedUrgency ?? currentUrgency) === level
                return (
                  <button
                    key={level}
                    onClick={() => setEditedUrgency(level)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      isSelected
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {IMAGING_URGENCY_LABELS[level]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Type Override */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imaging Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['xray', 'ultrasound', 'both'] as ImagingType[]).map((type) => {
                const isSelected = (editedType ?? currentType) === type
                return (
                  <button
                    key={type}
                    onClick={() => setEditedType(type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      isSelected
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {IMAGING_TYPE_LABELS[type]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Region Override */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body Region
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['chest', 'abdomen', 'extremity', 'head', 'spine', 'multiple'] as BodyRegion[]).map((region) => {
                const isSelected = (editedRegion ?? currentRegion) === region
                return (
                  <button
                    key={region}
                    onClick={() => setEditedRegion(region)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      isSelected
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {BODY_REGION_LABELS[region]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Edit Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCancelEdit}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Contributing Factors */}
      <div className="card">
        <button
          onClick={() => setShowFactors(!showFactors)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Contributing Factors</span>
            <span className="text-sm text-gray-500">
              ({urgencyResult.urgencyFactors.length})
            </span>
          </div>
          {showFactors ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showFactors && (
          <div className="mt-4 space-y-3">
            {urgencyResult.urgencyFactors.length > 0 ? (
              urgencyResult.urgencyFactors.map((factor, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{factor.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          factor.category === 'vital'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {factor.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{factor.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className="text-lg font-bold text-gray-900">
                      +{Math.round(factor.contribution)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                No significant factors detected
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isEditing && !imagingRequest && (
        <div className="space-y-3">
          {currentUrgency !== 'not-required' ? (
            <>
              <button
                onClick={handleAccept}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Accept Recommendation
              </button>
              <button
                onClick={handleSkipImaging}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Skip Imaging
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSkipImaging}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Confirm: No Imaging Needed
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Edit2 className="w-5 h-5" />
                Override: Request Imaging
              </button>
            </>
          )}
        </div>
      )}

      {/* Already Decided Indicator */}
      {imagingRequest && !isEditing && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="font-medium text-green-800">Decision Recorded</div>
            <div className="text-sm text-green-600">
              {imagingRequest.status === 'not-needed'
                ? 'Imaging not required for this patient'
                : `${IMAGING_TYPE_LABELS[imagingRequest.imagingType]} of ${BODY_REGION_LABELS[imagingRequest.bodyRegion]} queued`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
