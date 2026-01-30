import { Link } from 'react-router-dom'
import { ClipboardPlus, Users, Scan, AlertTriangle, ChevronRight } from 'lucide-react'
import { usePatientStore } from '../store/patientStore'
import { Card } from '../components/ui'

export default function Home() {
  const { assessments } = usePatientStore()

  const stats = {
    total: assessments.length,
    immediate: assessments.filter(a => a.triageScore?.priority === 'immediate').length,
    urgent: assessments.filter(a => a.triageScore?.priority === 'urgent').length,
    waiting: assessments.filter(a => !a.triageScore).length,
  }

  const imagingStats = {
    pending: assessments.filter(a => a.imagingRequest?.status === 'pending').length,
    critical: assessments.filter(a =>
      a.imagingRequest?.status === 'pending' &&
      a.imagingRequest?.urgency === 'critical'
    ).length,
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Hero Section - Compact */}
      <div className="text-center py-4" data-onboarding="home-hero">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Medical Triage Assistant
        </h2>
        <p className="text-sm text-gray-600">
          AI-powered assessment. Works offline.
        </p>
      </div>

      {/* Quick Stats - Compact Grid */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard value={stats.total} label="Total" color="text-primary-600" />
        <StatCard value={stats.immediate} label="Immediate" color="text-red-600" />
        <StatCard value={stats.urgent} label="Urgent" color="text-amber-600" />
        <StatCard value={stats.waiting} label="Pending" color="text-gray-400" />
      </div>

      {/* Imaging Alert - Only show if there are pending */}
      {imagingStats.critical > 0 && (
        <Link to="/imaging-queue">
          <Card padding="sm" className="bg-red-50 border-red-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-red-900">
                {imagingStats.critical} Critical Imaging
              </div>
              <div className="text-xs text-red-700">Requires immediate attention</div>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400" />
          </Card>
        </Link>
      )}

      {/* Main Actions - Compact */}
      <div className="space-y-2">
        <ActionCard
          to="/assessment"
          icon={ClipboardPlus}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
          title="New Assessment"
          description="Start patient triage"
          hoverColor="hover:bg-primary-50 hover:border-primary-200"
          data-onboarding="new-assessment-btn"
        />

        <ActionCard
          to="/queue"
          icon={Users}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          title="Patient Queue"
          description="View triaged patients"
          hoverColor="hover:bg-amber-50 hover:border-amber-200"
          badge={stats.total > 0 ? stats.total : undefined}
        />

        <ActionCard
          to="/imaging-queue"
          icon={Scan}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          title="Imaging Queue"
          description="Manage imaging"
          hoverColor="hover:bg-blue-50 hover:border-blue-200"
          badge={imagingStats.pending > 0 ? imagingStats.pending : undefined}
        />
      </div>
    </div>
  )
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Card padding="sm" className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </Card>
  )
}

interface ActionCardProps {
  to: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  description: string
  hoverColor: string
  badge?: number
  'data-onboarding'?: string
}

function ActionCard({
  to,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  hoverColor,
  badge,
  ...props
}: ActionCardProps) {
  return (
    <Link to={to} {...props}>
      <Card padding="sm" className={`flex items-center gap-3 transition-colors ${hoverColor}`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900">{title}</div>
          <div className="text-xs text-gray-500 truncate">{description}</div>
        </div>
        {badge !== undefined && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {badge}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </Card>
    </Link>
  )
}
