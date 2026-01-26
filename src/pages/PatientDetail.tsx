import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Clock, AlertTriangle } from 'lucide-react'
import { usePatientStore } from '../store/patientStore'
import { TRIAGE_COLORS, TRIAGE_LABELS } from '../types'
import TriageResult from '../components/Triage/TriageResult'
import XrayAnalysisSection from '../components/PatientDetail/XrayAnalysisSection'

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { assessments, deleteAssessment } = usePatientStore()

  const assessment = assessments.find((a) => a.id === patientId)

  if (!assessment) {
    return (
      <div className="pb-20">
        <Link to="/queue" className="flex items-center gap-2 text-primary-700 mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Queue
        </Link>
        <div className="card text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-1">Patient not found</h3>
          <p className="text-sm text-gray-500">This assessment may have been deleted</p>
        </div>
      </div>
    )
  }

  const priority = assessment.triageScore?.priority || 'minimal'
  const colors = TRIAGE_COLORS[priority]

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this assessment?')) {
      deleteAssessment(assessment.id)
      navigate('/queue')
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/queue" className="flex items-center gap-2 text-primary-700">
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
        <div className="flex gap-2">
          <Link
            to={`/assessment/${assessment.id}`}
            className="p-2 text-gray-500 hover:text-primary-700 transition-colors"
          >
            <Edit className="w-5 h-5" />
          </Link>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Patient Header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl ${colors.bg} ${colors.text}`}
          >
            {assessment.patient.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {assessment.patient.name || 'Unknown Patient'}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
              <span>{assessment.patient.age || '?'} years</span>
              <span className="capitalize">{assessment.patient.gender || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
              >
                {TRIAGE_LABELS[priority]}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {formatDate(assessment.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {assessment.patient.chiefComplaint && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Chief Complaint</h3>
            <p className="text-gray-900">{assessment.patient.chiefComplaint}</p>
          </div>
        )}
      </div>

      {/* Triage Result */}
      {assessment.triageScore && (
        <TriageResult
          score={assessment.triageScore}
          assessmentId={assessment.id}
        />
      )}

      {/* Vitals */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Vital Signs</h3>
        <div className="grid grid-cols-2 gap-4">
          <VitalItem
            label="Blood Pressure"
            value={
              assessment.vitals.bloodPressureSystolic && assessment.vitals.bloodPressureDiastolic
                ? `${assessment.vitals.bloodPressureSystolic}/${assessment.vitals.bloodPressureDiastolic}`
                : null
            }
            unit="mmHg"
          />
          <VitalItem
            label="Heart Rate"
            value={assessment.vitals.heartRate}
            unit="bpm"
          />
          <VitalItem
            label="Respiratory Rate"
            value={assessment.vitals.respiratoryRate}
            unit="/min"
          />
          <VitalItem
            label="SpO2"
            value={assessment.vitals.oxygenSaturation}
            unit="%"
          />
          <VitalItem
            label="Temperature"
            value={assessment.vitals.temperature}
            unit="°C"
          />
        </div>
      </div>

      {/* Symptoms */}
      {assessment.symptoms.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Symptoms</h3>
          <div className="flex flex-wrap gap-2">
            {assessment.symptoms
              .filter((s) => s.selected)
              .map((symptom) => (
                <span
                  key={symptom.id}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    symptom.severity >= 8
                      ? 'bg-red-100 text-red-700'
                      : symptom.severity >= 5
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {symptom.name}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* X-Ray Analysis */}
      {assessment.xrayAnalysis && (
        <XrayAnalysisSection
          analysis={assessment.xrayAnalysis}
          assessmentId={assessment.id}
        />
      )}

      {/* Voice Notes */}
      {assessment.voiceNotes.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Voice Notes</h3>
          <div className="space-y-3">
            {assessment.voiceNotes.map((note) => (
              <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-700">{note.transcript}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Notes */}
      {assessment.additionalNotes && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">Additional Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{assessment.additionalNotes}</p>
        </div>
      )}
    </div>
  )
}

function VitalItem({
  label,
  value,
  unit,
}: {
  label: string
  value: number | string | null
  unit: string
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-semibold text-gray-900">
        {value !== null ? (
          <>
            {value}
            <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
          </>
        ) : (
          <span className="text-gray-400">--</span>
        )}
      </div>
    </div>
  )
}
