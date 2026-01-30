import { Loader2, Wifi, WifiOff, AlertCircle, Sparkles, Cpu } from 'lucide-react'
import { Card } from '../../ui'

type ConnectionStatus = 'unknown' | 'checking' | 'connected' | 'disconnected' | 'error'

interface ModelSelectorProps {
  currentModel: 'onnx' | 'lmstudio'
  onModelChange: (model: 'onnx' | 'lmstudio') => void
  lmStudioStatus: ConnectionStatus
  onCheckConnection: () => void
}

export default function ModelSelector({
  currentModel,
  onModelChange,
  lmStudioStatus,
  onCheckConnection,
}: ModelSelectorProps) {
  return (
    <Card padding="sm" variant="flat" className="bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Analysis Model</h4>
        {currentModel === 'lmstudio' && (
          <button
            onClick={onCheckConnection}
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
            disabled={lmStudioStatus === 'checking'}
          >
            {lmStudioStatus === 'checking' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : lmStudioStatus === 'connected' ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
            {lmStudioStatus === 'checking' ? 'Checking...' :
             lmStudioStatus === 'connected' ? 'Connected' : 'Check'}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <ModelOption
          active={currentModel === 'onnx'}
          onClick={() => onModelChange('onnx')}
          icon={<Cpu className="w-4 h-4 text-primary-600" />}
          title="Chest X-ray Model"
          description="Fast, 18 pathologies, works offline"
        />
        <ModelOption
          active={currentModel === 'lmstudio'}
          onClick={() => onModelChange('lmstudio')}
          icon={<Sparkles className="w-4 h-4 text-purple-600" />}
          title="Advanced AI"
          description="Detailed analysis, interactive Q&A"
          badge={lmStudioStatus === 'connected' ? 'Online' : undefined}
        />
      </div>

      {currentModel === 'lmstudio' && lmStudioStatus !== 'connected' && (
        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          LM Studio server required. Configure in Settings.
        </p>
      )}
    </Card>
  )
}

function ModelOption({
  active,
  onClick,
  icon,
  title,
  description,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 p-2.5 rounded-lg border-2 transition-all text-left ${
        active
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-sm font-medium text-gray-800">{title}</span>
        {badge && (
          <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </button>
  )
}
