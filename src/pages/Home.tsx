import { Link } from 'react-router-dom'
import { ClipboardPlus, Users, Activity, Shield } from 'lucide-react'
import { usePatientStore } from '../store/patientStore'

export default function Home() {
  const { assessments } = usePatientStore()

  const stats = {
    total: assessments.length,
    immediate: assessments.filter(a => a.triageScore?.priority === 'immediate').length,
    urgent: assessments.filter(a => a.triageScore?.priority === 'urgent').length,
    waiting: assessments.filter(a => !a.triageScore).length,
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Medical Triage Assistant
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          AI-powered assessment for disaster response. Works completely offline.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-700">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Patients</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-red-600">{stats.immediate}</div>
          <div className="text-sm text-gray-600">Immediate</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-amber-600">{stats.urgent}</div>
          <div className="text-sm text-gray-600">Urgent</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-600">{stats.waiting}</div>
          <div className="text-sm text-gray-600">Pending Triage</div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="space-y-3">
        <Link
          to="/assessment"
          className="card flex items-center gap-4 hover:bg-primary-50 hover:border-primary-200 transition-colors"
        >
          <div className="bg-primary-100 p-3 rounded-xl">
            <ClipboardPlus className="w-6 h-6 text-primary-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">New Assessment</h3>
            <p className="text-sm text-gray-600">Start a new patient triage assessment</p>
          </div>
        </Link>

        <Link
          to="/queue"
          className="card flex items-center gap-4 hover:bg-primary-50 hover:border-primary-200 transition-colors"
        >
          <div className="bg-amber-100 p-3 rounded-xl">
            <Users className="w-6 h-6 text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Patient Queue</h3>
            <p className="text-sm text-gray-600">View and manage triaged patients</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
