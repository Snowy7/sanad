import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Clock, AlertTriangle } from 'lucide-react'
import { usePatientStore } from '../store/patientStore'
import { useChatContext } from '../context/ChatContext'
import { triageColors, getSeverityColor } from '../lib/designTokens'
import { Card, Badge } from '../components/ui'
import TriageResult from '../components/Triage/TriageResult'
import XrayAnalysisSection from '../components/PatientDetail/XrayAnalysisSection'

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { assessments, deleteAssessment } = usePatientStore()
  const { setContext } = useChatContext()

  const assessment = assessments.find((a) => a.id === patientId)

  // Update chat context with patient data
  useEffect(() => {
    if (assessment) {
      setContext({
        page: 'patient-detail',
        patient: assessment,
      })
    }
    return () => {
      setContext({ patient: undefined })
    }
  }, [assessment, setContext])

  if (!assessment) {
    return (
      <div className="pb-20">
        <Link to="/queue" className="flex items-center gap-2 text-primary-600 mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Queue
        </Link>
        <Card className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-1">Patient not found</h3>
          <p className="text-sm text-gray-500">This assessment may have been deleted</p>
        </Card>
      </div>
    )
  }

  const priority = assessment.triageScore?.priority || 'minimal'
  const colors = triageColors[priority]

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this assessment?')) {
      try {
        await deleteAssessment(assessment.id)
        navigate('/queue')
      } catch (error) {
        console.error('Failed to delete assessment:', error)
        alert('Failed to delete assessment. Please try again.')
      }
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
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/queue" className="flex items-center gap-2 text-primary-600">
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
        <div className="flex gap-1">
          <Link
            to={`/assessment/${assessment.id}`}
            className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <Edit className="w-5 h-5" />
          </Link>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Patient Header */}
      <Card padding="md">
        <div className="flex items-start gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${colors.bg} ${colors.text}`}
          >
            {assessment.patient.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {assessment.patient.name || 'Unknown Patient'}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{assessment.patient.age || '?'} years</span>
              <span className="capitalize">{assessment.patient.gender || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="triage" priority={priority} />
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {formatDate(assessment.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {assessment.patient.chiefComplaint && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h3 className="text-xs font-medium text-gray-500 mb-1">Chief Complaint</h3>
            <p className="text-sm text-gray-900">{assessment.patient.chiefComplaint}</p>
          </div>
        )}
      </Card>

      {/* Triage Result */}
      {assessment.triageScore && (
        <TriageResult
          score={assessment.triageScore}
          assessmentId={assessment.id}
        />
      )}

      {/* Vitals */}
      <Card padding="md">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Vital Signs</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <VitalItem
            label="Blood Pressure"
            value={
              assessment.vitals.bloodPressureSystolic && assessment.vitals.bloodPressureDiastolic
                ? `${assessment.vitals.bloodPressureSystolic}/${assessment.vitals.bloodPressureDiastolic}`
                : null
            }
            unit="mmHg"
          />
          <VitalItem label="Heart Rate" value={assessment.vitals.heartRate} unit="bpm" />
          <VitalItem label="Resp. Rate" value={assessment.vitals.respiratoryRate} unit="/min" />
          <VitalItem label="SpO2" value={assessment.vitals.oxygenSaturation} unit="%" />
          <VitalItem label="Temperature" value={assessment.vitals.temperature} unit="°C" />
        </div>
      </Card>

      {/* Symptoms */}
      {assessment.symptoms.filter(s => s.selected).length > 0 && (
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Symptoms</h3>
          <div className="flex flex-wrap gap-1.5">
            {assessment.symptoms
              .filter((s) => s.selected)
              .map((symptom) => {
                const severityColor = getSeverityColor(symptom.severity)
                return (
                  <span
                    key={symptom.id}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${severityColor.bg} ${severityColor.text}`}
                  >
                    {symptom.name}
                  </span>
                )
              })}
          </div>
        </Card>
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
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Voice Notes</h3>
          <div className="space-y-2">
            {assessment.voiceNotes.map((note) => (
              <div key={note.id} className="p-2 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{note.transcript}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(note.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Additional Notes */}
      {assessment.additionalNotes && (
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">Additional Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{assessment.additionalNotes}</p>
        </Card>
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
    <div className="p-2 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="font-semibold text-gray-900 text-sm">
        {value !== null ? (
          <>
            {value}
            <span className="text-xs font-normal text-gray-500 ml-0.5">{unit}</span>
          </>
        ) : (
          <span className="text-gray-300">--</span>
        )}
      </div>
    </div>
  )
}
