import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, ChevronRight, Filter } from 'lucide-react'
import { usePatientStore } from '../store/patientStore'
import { TriagePriority } from '../types'
import { triageColors, triageLabels, triagePriorityOrder } from '../lib/designTokens'
import { Card, Badge } from '../components/ui'

type FilterType = 'all' | TriagePriority

export default function Queue() {
  const { assessments } = usePatientStore()
  const [filter, setFilter] = useState<FilterType>('all')

  const sortedAssessments = [...assessments]
    .filter(a => filter === 'all' || a.triageScore?.priority === filter)
    .sort((a, b) => {
      const aPriority = a.triageScore?.priority || 'minimal'
      const bPriority = b.triageScore?.priority || 'minimal'

      if (triagePriorityOrder[aPriority] !== triagePriorityOrder[bPriority]) {
        return triagePriorityOrder[aPriority] - triagePriorityOrder[bPriority]
      }

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
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All
        </FilterButton>
        {(['immediate', 'urgent', 'delayed', 'minimal'] as TriagePriority[]).map((priority) => {
          const colors = triageColors[priority]
          return (
            <FilterButton
              key={priority}
              active={filter === priority}
              onClick={() => setFilter(priority)}
              activeClass={`${colors.bg} ${colors.text} border ${colors.border}`}
            >
              {triageLabels[priority]}
            </FilterButton>
          )
        })}
      </div>

      {/* Patient List */}
      {sortedAssessments.length === 0 ? (
        <Card className="text-center py-12">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-1">No patients found</h3>
          <p className="text-sm text-gray-500">
            {filter === 'all'
              ? 'Start a new assessment to add patients'
              : `No patients with ${triageLabels[filter]} priority`}
          </p>
          {filter === 'all' && (
            <Link to="/assessment" className="btn-primary inline-block mt-4">
              New Assessment
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedAssessments.map((assessment, index) => {
            const priority = assessment.triageScore?.priority || 'minimal'
            const colors = triageColors[priority]

            return (
              <Link
                key={assessment.id}
                to={`/patient/${assessment.id}`}
              >
                <Card padding="sm" hover className="flex items-center gap-3">
                  {/* Queue Position */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${colors.bg} ${colors.text}`}
                  >
                    {index + 1}
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {assessment.patient.name || 'Unknown Patient'}
                      </h3>
                      <Badge variant="triage" priority={priority} size="sm" />
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {assessment.patient.chiefComplaint || 'No chief complaint'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {getTimeAgo(assessment.createdAt)}
                      <span className="mx-1">•</span>
                      Score: {assessment.triageScore?.score || 0}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterButton({
  children,
  active,
  onClick,
  activeClass,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  activeClass?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? activeClass || 'bg-primary-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}
