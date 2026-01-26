import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, ChevronRight, Filter } from 'lucide-react'
import { usePatientStore } from '../store/patientStore'
import { TriagePriority, TRIAGE_COLORS, TRIAGE_LABELS } from '../types'

type FilterType = 'all' | TriagePriority

export default function Queue() {
  const { assessments } = usePatientStore()
  const [filter, setFilter] = useState<FilterType>('all')

  const sortedAssessments = [...assessments]
    .filter(a => filter === 'all' || a.triageScore?.priority === filter)
    .sort((a, b) => {
      // Sort by priority (immediate > urgent > delayed > minimal)
      const priorityOrder: Record<TriagePriority, number> = {
        immediate: 0,
        urgent: 1,
        delayed: 2,
        minimal: 3,
      }
      const aPriority = a.triageScore?.priority || 'minimal'
      const bPriority = b.triageScore?.priority || 'minimal'

      if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
        return priorityOrder[aPriority] - priorityOrder[bPriority]
      }

      // Then by score (higher score = more urgent)
      return (b.triageScore?.score || 0) - (a.triageScore?.score || 0)
    })

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Patient Queue</h2>
        <div className="text-sm text-gray-500">{sortedAssessments.length} patients</div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'bg-primary-700 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {(['immediate', 'urgent', 'delayed', 'minimal'] as TriagePriority[]).map((priority) => (
          <button
            key={priority}
            onClick={() => setFilter(priority)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === priority
                ? `${TRIAGE_COLORS[priority].bg} ${TRIAGE_COLORS[priority].text}`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {TRIAGE_LABELS[priority]}
          </button>
        ))}
      </div>

      {/* Patient List */}
      {sortedAssessments.length === 0 ? (
        <div className="card text-center py-12">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-1">No patients found</h3>
          <p className="text-sm text-gray-500">
            {filter === 'all'
              ? 'Start a new assessment to add patients'
              : `No patients with ${TRIAGE_LABELS[filter]} priority`}
          </p>
          {filter === 'all' && (
            <Link to="/assessment" className="btn-primary inline-block mt-4">
              New Assessment
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAssessments.map((assessment, index) => {
            const priority = assessment.triageScore?.priority || 'minimal'
            const colors = TRIAGE_COLORS[priority]

            return (
              <Link
                key={assessment.id}
                to={`/patient/${assessment.id}`}
                className="card flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                {/* Priority Badge */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${colors.bg} ${colors.text}`}
                >
                  {index + 1}
                </div>

                {/* Patient Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {assessment.patient.name || 'Unknown Patient'}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {TRIAGE_LABELS[priority]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {assessment.patient.chiefComplaint || 'No chief complaint'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {getTimeAgo(assessment.createdAt)}
                    <span className="mx-1">•</span>
                    Score: {assessment.triageScore?.score || 0}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
