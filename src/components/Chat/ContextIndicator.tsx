import { useChatContext, ChatPage, AssessmentStep } from '../../context/ChatContext'
import { cn } from '../../lib/designTokens'
import { User, FileText, ListOrdered, ImageIcon, Settings, Home } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

const pageConfig: Record<ChatPage, { icon: LucideIcon; label: string; color: string }> = {
  home: { icon: Home, label: 'Dashboard', color: 'text-blue-600 bg-blue-50' },
  assessment: { icon: FileText, label: 'Assessment', color: 'text-green-600 bg-green-50' },
  queue: { icon: ListOrdered, label: 'Queue', color: 'text-purple-600 bg-purple-50' },
  'patient-detail': { icon: User, label: 'Patient', color: 'text-amber-600 bg-amber-50' },
  imaging: { icon: ImageIcon, label: 'Imaging', color: 'text-cyan-600 bg-cyan-50' },
  settings: { icon: Settings, label: 'Settings', color: 'text-gray-600 bg-gray-100' },
}

const stepLabels: Record<AssessmentStep, string> = {
  'patient-info': 'Patient Info',
  vitals: 'Vitals',
  symptoms: 'Symptoms',
  'imaging-decision': 'Imaging',
  xray: 'X-ray',
  voice: 'Voice Notes',
  review: 'Review',
}

export default function ContextIndicator() {
  const { context } = useChatContext()
  const config = pageConfig[context.page]
  const Icon = config.icon

  return (
    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
      <div className="flex items-center gap-2 text-xs">
        <div
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center',
            config.color
          )}
        >
          <Icon className="w-3 h-3" />
        </div>
        <span className="text-gray-600">{config.label}</span>

        {/* Show step if in assessment */}
        {context.page === 'assessment' && context.step && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500">{stepLabels[context.step]}</span>
          </>
        )}

        {/* Show patient name if available */}
        {context.patient && (
          <>
            <span className="text-gray-300">•</span>
            <span className="text-gray-700 font-medium truncate max-w-[120px]">
              {context.patient.patient.name || 'Unknown'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
