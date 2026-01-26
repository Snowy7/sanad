import { useState } from 'react'
import { AlertTriangle, X, RefreshCw, Check } from 'lucide-react'

interface ConflictBannerProps {
  localUpdatedAt: Date
  serverUpdatedAt: Date
  onKeepLocal: () => void
  onKeepServer: () => void
  onDismiss: () => void
}

export default function ConflictBanner({
  localUpdatedAt,
  serverUpdatedAt,
  onKeepLocal,
  onKeepServer,
  onDismiss,
}: ConflictBannerProps) {
  const [isResolving, setIsResolving] = useState(false)

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const handleKeepLocal = async () => {
    setIsResolving(true)
    try {
      await onKeepLocal()
    } finally {
      setIsResolving(false)
    }
  }

  const handleKeepServer = async () => {
    setIsResolving(true)
    try {
      await onKeepServer()
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 p-2 rounded-lg shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-amber-800">Sync Conflict Detected</h4>
            <button
              onClick={onDismiss}
              className="p-1 text-amber-600 hover:text-amber-800 -mt-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-amber-700 mt-1 mb-3">
            This assessment was modified both locally and on the server.
            Choose which version to keep:
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-gray-500 mb-1">Local Version</p>
              <p className="text-sm font-medium text-gray-800">
                {formatTime(localUpdatedAt)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-gray-500 mb-1">Server Version</p>
              <p className="text-sm font-medium text-gray-800">
                {formatTime(serverUpdatedAt)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleKeepLocal}
              disabled={isResolving}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isResolving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Keep Local
            </button>
            <button
              onClick={handleKeepServer}
              disabled={isResolving}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {isResolving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Use Server
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
