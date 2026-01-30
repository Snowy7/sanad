import { useState } from 'react'
import { X, Truck, Check, AlertCircle } from 'lucide-react'
import { useMobileUnitStore, MobileUnitType } from '../../store/mobileUnitStore'
import { ImagingType } from '../../types'

interface AssignUnitModalProps {
  isOpen: boolean
  onClose: () => void
  assessmentId: string
  requiredType: ImagingType
  patientName: string
  onAssign: (unitId: string) => void
}

const UNIT_TYPE_LABELS: Record<MobileUnitType, string> = {
  xray: 'X-Ray',
  ultrasound: 'Ultrasound',
  both: 'X-Ray + Ultrasound',
}

export default function AssignUnitModal({
  isOpen,
  onClose,
  assessmentId: _assessmentId,
  requiredType,
  patientName,
  onAssign,
}: AssignUnitModalProps) {
  const { getAvailableUnits } = useMobileUnitStore()
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  if (!isOpen) return null

  // Get units that can handle the required imaging type
  const availableUnits = getAvailableUnits(requiredType)

  const handleAssign = () => {
    if (selectedUnitId) {
      onAssign(selectedUnitId)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Assign Mobile Unit</h3>
                <p className="text-sm text-gray-500">{patientName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Required Type */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-700">
                <span className="font-medium">Required:</span>{' '}
                {requiredType === 'both' ? 'X-Ray + Ultrasound' : requiredType === 'xray' ? 'X-Ray' : 'Ultrasound'}
              </div>
            </div>

            {/* Available Units */}
            {availableUnits.length > 0 ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Available Unit
                </label>
                {availableUnits.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => setSelectedUnitId(unit.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      selectedUnitId === unit.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          selectedUnitId === unit.id
                            ? 'bg-primary-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        <Truck
                          className={`w-4 h-4 ${
                            selectedUnitId === unit.id
                              ? 'text-primary-600'
                              : 'text-gray-500'
                          }`}
                        />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          {unit.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {UNIT_TYPE_LABELS[unit.type]}
                        </div>
                      </div>
                    </div>
                    {selectedUnitId === unit.id && (
                      <Check className="w-5 h-5 text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">
                  No Units Available
                </h4>
                <p className="text-sm text-gray-500">
                  All compatible units are currently assigned or offline.
                  Please wait or manage units.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-gray-200">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedUnitId}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Assign Unit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
