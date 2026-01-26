import { Cloud, CloudOff, Loader2, AlertCircle, Check } from 'lucide-react'
import { SyncStatus } from '../../types'

interface SyncStatusBadgeProps {
  status: SyncStatus
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export default function SyncStatusBadge({
  status,
  showLabel = false,
  size = 'sm',
}: SyncStatusBadgeProps) {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  const config: Record<SyncStatus, {
    icon: typeof Cloud
    label: string
    className: string
  }> = {
    pending: {
      icon: CloudOff,
      label: 'Pending sync',
      className: 'text-gray-400 bg-gray-100',
    },
    syncing: {
      icon: Loader2,
      label: 'Syncing...',
      className: 'text-blue-500 bg-blue-100 animate-spin',
    },
    synced: {
      icon: Check,
      label: 'Synced',
      className: 'text-green-500 bg-green-100',
    },
    conflict: {
      icon: AlertCircle,
      label: 'Conflict',
      className: 'text-amber-500 bg-amber-100',
    },
    error: {
      icon: AlertCircle,
      label: 'Sync error',
      className: 'text-red-500 bg-red-100',
    },
  }

  const { icon: Icon, label, className } = config[status]

  if (showLabel) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className.split(' ').filter(c => !c.includes('animate')).join(' ')}`}>
        <Icon className={`${iconSize} ${status === 'syncing' ? 'animate-spin' : ''}`} />
        {label}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${className.split(' ').filter(c => !c.includes('animate')).join(' ')}`} title={label}>
      <Icon className={`${iconSize} ${status === 'syncing' ? 'animate-spin' : ''}`} />
    </span>
  )
}
