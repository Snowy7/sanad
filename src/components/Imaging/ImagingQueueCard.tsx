import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Scan,
  Clock,
  User,
  AlertTriangle,
  Play,
  CheckCircle,
  Truck,
} from 'lucide-react'
import {
  Assessment,
  IMAGING_URGENCY_COLORS,
  IMAGING_URGENCY_LABELS,
  ImagingType,
  BodyRegion,
} from '../../types'
import { useMobileUnitStore } from '../../store/mobileUnitStore'

interface ImagingQueueCardProps {
  assessment: Assessment
  onAssignUnit: (assessmentId: string) => void
  onStartImaging: (assessmentId: string) => void
  onCompleteImaging: (assessmentId: string) => void
}

const IMAGING_TYPE_LABELS: Record<ImagingType, string> = {
  xray: 'X-Ray',
  ultrasound: 'Ultrasound',
  both: 'X-Ray + US',
}

const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  chest: 'Chest',
  abdomen: 'Abdomen',
  extremity: 'Extremity',
  head: 'Head',
  spine: 'Spine',
  multiple: 'Multiple',
}

export default function ImagingQueueCard({
  assessment,
  onAssignUnit,
  onStartImaging,
  onCompleteImaging,
}: ImagingQueueCardProps) {
  const { getUnitByAssignment } = useMobileUnitStore()
  const imagingRequest = assessment.imagingRequest

  // Skip if no imaging request or not needed
  if (!imagingRequest || imagingRequest.status === 'not-needed') {
    return null
  }

  const urgencyColors = IMAGING_URGENCY_COLORS[imagingRequest.urgency]
  const assignedUnit = getUnitByAssignment(assessment.id)

  // Calculate wait time
  const waitTime = useMemo(() => {
    const requestedAt = new Date(imagingRequest.requestedAt)
    const now = new Date()
    const diffMs = now.getTime() - requestedAt.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }, [imagingRequest.requestedAt])

  return (
    <div className={`card border-l-4 ${urgencyColors.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <Link
              to={`/patient/${assessment.id}`}
              className="font-semibold text-gray-900 hover:text-primary-600"
            >
              {assessment.patient.name}
            </Link>
            <div className="text-sm text-gray-500">
              {assessment.patient.age}y, {assessment.patient.gender}
            </div>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${urgencyColors.bg} ${urgencyColors.text}`}
        >
          {imagingRequest.urgency === 'critical' && (
            <AlertTriangle className="w-3 h-3 mr-1" />
          )}
          {IMAGING_URGENCY_LABELS[imagingRequest.urgency]}
        </span>
      </div>

      {/* Chief Complaint */}
      <div className="text-sm text-gray-700 mb-3">
        <span className="font-medium">Chief Complaint:</span>{' '}
        {assessment.patient.chiefComplaint || 'Not specified'}
      </div>

      {/* Imaging Details */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
          <Scan className="w-3 h-3 mr-1" />
          {IMAGING_TYPE_LABELS[imagingRequest.imagingType]}
        </span>
        <span className="inline-flex items-center px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-medium">
          {BODY_REGION_LABELS[imagingRequest.bodyRegion]}
        </span>
        <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Wait: {waitTime}
        </span>
      </div>

      {/* Clinical Indication */}
      <div className="text-sm text-gray-600 mb-4 p-2 bg-gray-50 rounded">
        {imagingRequest.clinicalIndication}
      </div>

      {/* Assigned Unit */}
      {assignedUnit && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-green-50 rounded border border-green-200">
          <Truck className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            {assignedUnit.name}
          </span>
          <span className="text-xs text-green-600">
            ({assignedUnit.status === 'imaging' ? 'In Progress' : 'Assigned'})
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {imagingRequest.status === 'pending' && !assignedUnit && (
          <button
            onClick={() => onAssignUnit(assessment.id)}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2"
          >
            <Truck className="w-4 h-4" />
            Assign Unit
          </button>
        )}

        {imagingRequest.status === 'pending' && assignedUnit && assignedUnit.status === 'assigned' && (
          <button
            onClick={() => onStartImaging(assessment.id)}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2"
          >
            <Play className="w-4 h-4" />
            Start Imaging
          </button>
        )}

        {imagingRequest.status === 'in-progress' && (
          <button
            onClick={() => onCompleteImaging(assessment.id)}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            Mark Complete
          </button>
        )}

        <Link
          to={`/patient/${assessment.id}`}
          className="btn-secondary flex items-center justify-center gap-2 text-sm py-2 px-4"
        >
          View
        </Link>
      </div>
    </div>
  )
}
