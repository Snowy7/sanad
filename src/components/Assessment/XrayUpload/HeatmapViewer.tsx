import { Flame } from 'lucide-react'
import { Card } from '../../ui'
import { PathologyHeatmap } from '../../../hooks/useXrayAnalysis'

interface HeatmapViewerProps {
  heatmaps: PathologyHeatmap[]
  selectedHeatmap: string | null
  onSelect: (name: string | null) => void
}

export default function HeatmapViewer({
  heatmaps,
  selectedHeatmap,
  onSelect,
}: HeatmapViewerProps) {
  if (heatmaps.length === 0) return null

  return (
    <Card padding="sm" className="bg-orange-50 border-orange-200">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="w-4 h-4 text-orange-500" />
        <h4 className="font-medium text-sm text-orange-700">Suspect Area Heatmaps</h4>
      </div>
      <p className="text-xs text-orange-600 mb-2">
        Click a pathology to see suspected location:
      </p>
      <div className="flex flex-wrap gap-1.5">
        <HeatmapButton
          active={!selectedHeatmap}
          onClick={() => onSelect(null)}
          label="Original"
        />
        {heatmaps.map((heatmap) => (
          <HeatmapButton
            key={heatmap.name}
            active={selectedHeatmap === heatmap.name}
            onClick={() => onSelect(heatmap.name)}
            label={`${heatmap.name} (${Math.round(heatmap.probability * 100)}%)`}
            isPathology
          />
        ))}
      </div>
      <p className="text-xs text-orange-500 mt-2">
        Red/orange = higher suspicion, Blue/green = lower
      </p>
    </Card>
  )
}

function HeatmapButton({
  active,
  onClick,
  label,
  isPathology = false,
}: {
  active: boolean
  onClick: () => void
  label: string
  isPathology?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? isPathology
            ? 'bg-orange-500 text-white'
            : 'bg-gray-200 text-gray-800'
          : isPathology
            ? 'bg-white text-orange-600 hover:bg-orange-100 border border-orange-200'
            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {label}
    </button>
  )
}
