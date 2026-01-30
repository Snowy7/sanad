import { useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Card } from '../../ui'

interface ImageUploaderProps {
  preview: string | null
  isDragging: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}

export default function ImageUploader({
  preview,
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onClear: _onClear,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (preview) {
    return null // Image is shown elsewhere
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed cursor-pointer transition-colors rounded-xl p-6 ${
        isDragging
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
      }`}
    >
      <div className="flex flex-col items-center py-6">
        <Upload
          className={`w-10 h-10 mb-3 ${
            isDragging ? 'text-primary-600' : 'text-gray-400'
          }`}
        />
        <p className="font-medium text-gray-700 mb-1">Drop X-ray image here</p>
        <p className="text-sm text-gray-500">or click to browse</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="hidden"
      />
    </div>
  )
}

export function ImagePreview({
  src,
  selectedHeatmap,
  onClear,
}: {
  src: string
  selectedHeatmap: string | null
  onClear: () => void
}) {
  return (
    <Card padding="none" className="overflow-hidden relative">
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={onClear}
          className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <img
        src={src}
        alt="X-ray preview"
        className="w-full bg-slate-900 object-contain max-h-72"
      />

      {selectedHeatmap && (
        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5">
          Showing: {selectedHeatmap}
        </div>
      )}
    </Card>
  )
}
