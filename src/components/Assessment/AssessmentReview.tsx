import { ClipboardCheck, User, Activity, Stethoscope, ImageIcon, Mic } from 'lucide-react'
import { AssessmentFormState, SYMPTOMS_LIST, XrayAnalysis } from '../../types'
import { calculateTriageScore } from '../../lib/triageEngine'

interface AssessmentReviewProps {
  formState: AssessmentFormState
  xrayAnalysis: XrayAnalysis | null
}

export default function AssessmentReview({
  formState,
  xrayAnalysis,
}: AssessmentReviewProps) {
  const selectedSymptomsList = SYMPTOMS_LIST.filter((s) =>
    formState.selectedSymptoms.includes(s.id)
  )

  const previewScore = calculateTriageScore({
    vitals: formState.vitals,
    symptoms: selectedSymptomsList.map((s) => ({ ...s, selected: true })),
    xrayAnalysis,
  })

  const priorityColors = {
    immediate: 'bg-red-500 text-white',
    urgent: 'bg-amber-500 text-white',
    delayed: 'bg-green-500 text-white',
    minimal: 'bg-gray-400 text-white',
  }

  const priorityLabels = {
    immediate: 'IMMEDIATE',
    urgent: 'URGENT',
    delayed: 'DELAYED',
    minimal: 'MINIMAL',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary-100 p-3 rounded-xl">
          <ClipboardCheck className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Review Assessment</h2>
          <p className="text-sm text-gray-500">Confirm details before submitting</p>
        </div>
      </div>

      {/* Triage Preview */}
      <div className="card text-center">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Triage Priority</h3>
        <div
          className={`inline-block px-6 py-3 rounded-xl text-2xl font-bold ${
            priorityColors[previewScore.priority]
          }`}
        >
          {priorityLabels[previewScore.priority]}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Score: {previewScore.score}/100
        </p>
        <p className="mt-3 text-gray-700">{previewScore.recommendation}</p>
      </div>

      {/* Patient Info Summary */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Patient Information</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Name:</span>{' '}
            <span className="font-medium text-gray-900">
              {formState.patient.name || 'Not provided'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Age:</span>{' '}
            <span className="font-medium text-gray-900">
              {formState.patient.age || 'Not provided'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Gender:</span>{' '}
            <span className="font-medium text-gray-900 capitalize">
              {formState.patient.gender || 'Not provided'}
            </span>
          </div>
        </div>
        {formState.patient.chiefComplaint && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Chief Complaint:</span>
            <p className="font-medium text-gray-900">{formState.patient.chiefComplaint}</p>
          </div>
        )}
      </div>

      {/* Vitals Summary */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Vital Signs</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>
            <span className="text-gray-500">BP:</span>{' '}
            <span className="font-medium text-gray-900">
              {formState.vitals.bloodPressureSystolic &&
              formState.vitals.bloodPressureDiastolic
                ? `${formState.vitals.bloodPressureSystolic}/${formState.vitals.bloodPressureDiastolic} mmHg`
                : '--'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">HR:</span>{' '}
            <span className="font-medium text-gray-900">
              {formState.vitals.heartRate
                ? `${formState.vitals.heartRate} bpm`
                : '--'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">RR:</span>{' '}
            <span className="font-medium text-gray-900">
              {formState.vitals.respiratoryRate
                ? `${formState.vitals.respiratoryRate}/min`
                : '--'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">SpO2:</span>{' '}
            <span className="font-medium text-gray-900">
              {formState.vitals.oxygenSaturation
                ? `${formState.vitals.oxygenSaturation}%`
                : '--'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Temp:</span>{' '}
            <span className="font-medium text-gray-900">
              {formState.vitals.temperature
                ? `${formState.vitals.temperature}°C`
                : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* Symptoms Summary */}
      {selectedSymptomsList.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">
              Symptoms ({selectedSymptomsList.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSymptomsList.map((symptom) => (
              <span
                key={symptom.id}
                className={`px-2 py-1 rounded text-sm ${
                  symptom.severity >= 8
                    ? 'bg-red-50 text-red-700'
                    : symptom.severity >= 5
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {symptom.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* X-Ray Summary */}
      {xrayAnalysis && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">X-Ray Analysis</h3>
          </div>
          <div
            className={`inline-block px-2 py-1 rounded text-sm font-medium capitalize ${
              xrayAnalysis.overallRisk === 'critical'
                ? 'bg-red-50 text-red-700'
                : xrayAnalysis.overallRisk === 'high'
                ? 'bg-orange-50 text-orange-700'
                : xrayAnalysis.overallRisk === 'moderate'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            Risk: {xrayAnalysis.overallRisk}
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {xrayAnalysis.findings.filter((f) => f.confidence > 0.3).length}{' '}
            significant finding(s) detected
          </div>
        </div>
      )}

      {/* Voice Notes Summary */}
      {(formState.voiceNotes.length > 0 || formState.additionalNotes) && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Notes</h3>
          </div>
          {formState.voiceNotes.length > 0 && (
            <p className="text-sm text-gray-500 mb-2">
              {formState.voiceNotes.length} voice note(s) recorded
            </p>
          )}
          {formState.additionalNotes && (
            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
              {formState.additionalNotes.slice(0, 100)}
              {formState.additionalNotes.length > 100 && '...'}
            </p>
          )}
        </div>
      )}

      {/* Contributing Factors */}
      <div className="card bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-3">
          Triage Contributing Factors
        </h3>
        <div className="space-y-2">
          {previewScore.factors
            .filter((f) => f.contribution > 0)
            .sort((a, b) => b.contribution - a.contribution)
            .slice(0, 5)
            .map((factor, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{factor.name}</span>
                <span className="font-medium text-primary-600">
                  +{Math.round(factor.contribution)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
