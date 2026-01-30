import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Scan,
  Filter,
  SortDesc,
  Settings,
} from 'lucide-react'
import { usePatientStore } from '../store/patientStore'
import { useMobileUnitStore } from '../store/mobileUnitStore'
import { ImagingUrgency, ImagingStatus } from '../types'
import ImagingQueueCard from '../components/Imaging/ImagingQueueCard'
import AssignUnitModal from '../components/Imaging/AssignUnitModal'

type UrgencyFilter = ImagingUrgency | 'all'
type StatusFilter = ImagingStatus | 'all'
type TypeFilter = 'xray' | 'ultrasound' | 'both' | 'all'

export default function ImagingQueue() {
  const { assessments, updateAssessment } = usePatientStore()
  const { assignUnit, startImaging, completeImaging, getUnitByAssignment, units } = useMobileUnitStore()

  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)

  // Get assessments with imaging requests
  const imagingAssessments = useMemo(() => {
    return assessments.filter(
      (a) => a.imagingRequest && a.imagingRequest.status !== 'not-needed'
    )
  }, [assessments])

  // Apply filters
  const filteredAssessments = useMemo(() => {
    return imagingAssessments
      .filter((a) => {
        const req = a.imagingRequest!
        if (urgencyFilter !== 'all' && req.urgency !== urgencyFilter) return false
        if (statusFilter !== 'all' && req.status !== statusFilter) return false
        if (typeFilter !== 'all' && req.imagingType !== typeFilter) return false
        return true
      })
      .sort((a, b) => {
        // Sort by urgency score (highest first)
        return (b.imagingRequest?.urgencyScore || 0) - (a.imagingRequest?.urgencyScore || 0)
      })
  }, [imagingAssessments, urgencyFilter, statusFilter, typeFilter])

  // Stats
  const stats = useMemo(() => {
    const pending = imagingAssessments.filter((a) => a.imagingRequest?.status === 'pending')
    const inProgress = imagingAssessments.filter((a) => a.imagingRequest?.status === 'in-progress')
    const completed = imagingAssessments.filter((a) => a.imagingRequest?.status === 'completed')
    const critical = pending.filter((a) => a.imagingRequest?.urgency === 'critical')

    return {
      pending: pending.length,
      inProgress: inProgress.length,
      completed: completed.length,
      critical: critical.length,
      availableUnits: units.filter((u) => u.status === 'available').length,
    }
  }, [imagingAssessments, units])

  const handleAssignUnit = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId)
    setAssignModalOpen(true)
  }

  const handleUnitAssigned = async (unitId: string) => {
    if (!selectedAssessmentId) return

    const assessment = assessments.find((a) => a.id === selectedAssessmentId)
    if (!assessment?.imagingRequest) return

    const unit = useMobileUnitStore.getState().getUnitById(unitId)
    if (!unit) return

    // Update mobile unit store
    assignUnit(unitId, selectedAssessmentId)

    // Update assessment's imaging request with unit info
    await updateAssessment(selectedAssessmentId, {
      imagingRequest: {
        ...assessment.imagingRequest,
        mobileUnit: {
          unitId: unit.id,
          unitName: unit.name,
          assignedAt: new Date(),
        },
      },
    })

    setSelectedAssessmentId(null)
  }

  const handleStartImaging = async (assessmentId: string) => {
    const assessment = assessments.find((a) => a.id === assessmentId)
    if (!assessment?.imagingRequest) return

    const unit = getUnitByAssignment(assessmentId)
    if (unit) {
      startImaging(unit.id)
    }

    await updateAssessment(assessmentId, {
      imagingRequest: {
        ...assessment.imagingRequest,
        status: 'in-progress',
      },
    })
  }

  const handleCompleteImaging = async (assessmentId: string) => {
    const assessment = assessments.find((a) => a.id === assessmentId)
    if (!assessment?.imagingRequest) return

    const unit = getUnitByAssignment(assessmentId)
    if (unit) {
      completeImaging(unit.id)
    }

    await updateAssessment(assessmentId, {
      imagingRequest: {
        ...assessment.imagingRequest,
        status: 'completed',
        completedAt: new Date(),
      },
    })
  }

  const selectedAssessment = selectedAssessmentId
    ? assessments.find((a) => a.id === selectedAssessmentId)
    : null

  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Scan className="w-7 h-7 text-blue-600" />
            Imaging Queue
          </h1>
          <p className="text-gray-500 mt-1">Manage imaging prioritization</p>
        </div>
        <Link
          to="/mobile-units"
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Settings className="w-4 h-4" />
          Manage Units
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          <div className="text-xs text-gray-500">Critical</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-xs text-gray-500">In Progress</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-primary-600">{stats.availableUnits}</div>
          <div className="text-xs text-gray-500">Available Units</div>
        </div>
      </div>

      {/* Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <Filter className="w-4 h-4" />
        Filters
        {(urgencyFilter !== 'all' || statusFilter !== 'pending' || typeFilter !== 'all') && (
          <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs">
            Active
          </span>
        )}
      </button>

      {/* Filters */}
      {showFilters && (
        <div className="card space-y-4">
          {/* Urgency Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'critical', 'high', 'routine'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setUrgencyFilter(level)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    urgencyFilter === level
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'in-progress', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imaging Type
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'xray', 'ultrasound', 'both'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    typeFilter === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'xray' ? 'X-Ray' : type === 'ultrasound' ? 'Ultrasound' : 'Both'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sort Indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <SortDesc className="w-4 h-4" />
        Sorted by imaging urgency score (highest first)
      </div>

      {/* Queue List */}
      {filteredAssessments.length > 0 ? (
        <div className="space-y-4">
          {filteredAssessments.map((assessment) => (
            <ImagingQueueCard
              key={assessment.id}
              assessment={assessment}
              onAssignUnit={handleAssignUnit}
              onStartImaging={handleStartImaging}
              onCompleteImaging={handleCompleteImaging}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Scan className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">No Imaging Requests</h3>
          <p className="text-gray-500 text-sm">
            {imagingAssessments.length === 0
              ? 'No patients have imaging requests yet'
              : 'No requests match your current filters'}
          </p>
        </div>
      )}

      {/* Assign Unit Modal */}
      {selectedAssessment && (
        <AssignUnitModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false)
            setSelectedAssessmentId(null)
          }}
          assessmentId={selectedAssessment.id}
          requiredType={selectedAssessment.imagingRequest?.imagingType || 'xray'}
          patientName={selectedAssessment.patient.name}
          onAssign={handleUnitAssigned}
        />
      )}
    </div>
  )
}
