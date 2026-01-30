import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  X,
  Check,
} from 'lucide-react'
import { useMobileUnitStore, MobileUnit, MobileUnitType, MobileUnitStatus } from '../store/mobileUnitStore'

const UNIT_TYPE_OPTIONS: { value: MobileUnitType; label: string }[] = [
  { value: 'xray', label: 'X-Ray Only' },
  { value: 'ultrasound', label: 'Ultrasound Only' },
  { value: 'both', label: 'X-Ray + Ultrasound' },
]

const STATUS_COLORS: Record<MobileUnitStatus, { bg: string; text: string }> = {
  available: { bg: 'bg-green-100', text: 'text-green-700' },
  assigned: { bg: 'bg-blue-100', text: 'text-blue-700' },
  imaging: { bg: 'bg-amber-100', text: 'text-amber-700' },
  offline: { bg: 'bg-gray-100', text: 'text-gray-500' },
}

const STATUS_LABELS: Record<MobileUnitStatus, string> = {
  available: 'Available',
  assigned: 'Assigned',
  imaging: 'Imaging',
  offline: 'Offline',
}

export default function MobileUnits() {
  const { units, addUnit, updateUnit, deleteUnit, setOffline, setAvailable } = useMobileUnitStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState<MobileUnit | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<MobileUnitType>('xray')

  const handleOpenAdd = () => {
    setFormName('')
    setFormType('xray')
    setEditingUnit(null)
    setShowAddModal(true)
  }

  const handleOpenEdit = (unit: MobileUnit) => {
    setFormName(unit.name)
    setFormType(unit.type)
    setEditingUnit(unit)
    setShowAddModal(true)
  }

  const handleSave = () => {
    if (!formName.trim()) return

    if (editingUnit) {
      updateUnit(editingUnit.id, { name: formName, type: formType })
    } else {
      addUnit({ name: formName, type: formType, status: 'available' })
    }

    setShowAddModal(false)
    setFormName('')
    setFormType('xray')
    setEditingUnit(null)
  }

  const handleDelete = (id: string) => {
    deleteUnit(id)
    setDeleteConfirm(null)
  }

  const handleToggleStatus = (unit: MobileUnit) => {
    if (unit.status === 'offline') {
      setAvailable(unit.id)
    } else if (unit.status === 'available') {
      setOffline(unit.id)
    }
  }

  // Stats
  const stats = {
    total: units.length,
    available: units.filter((u) => u.status === 'available').length,
    assigned: units.filter((u) => u.status === 'assigned').length,
    imaging: units.filter((u) => u.status === 'imaging').length,
    offline: units.filter((u) => u.status === 'offline').length,
  }

  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/imaging-queue"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Imaging Queue
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-600" />
            Mobile Units
          </h1>
          <p className="text-gray-500 mt-1">Manage portable imaging equipment</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Unit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Units</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          <div className="text-xs text-gray-500">Available</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
          <div className="text-xs text-gray-500">Assigned</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-amber-600">{stats.imaging}</div>
          <div className="text-xs text-gray-500">Imaging</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-gray-400">{stats.offline}</div>
          <div className="text-xs text-gray-500">Offline</div>
        </div>
      </div>

      {/* Units List */}
      {units.length > 0 ? (
        <div className="space-y-3">
          {units.map((unit) => (
            <div
              key={unit.id}
              className={`card flex items-center justify-between ${
                unit.status === 'offline' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    unit.status === 'offline' ? 'bg-gray-100' : 'bg-blue-100'
                  }`}
                >
                  <Truck
                    className={`w-6 h-6 ${
                      unit.status === 'offline' ? 'text-gray-400' : 'text-blue-600'
                    }`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{unit.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">
                      {unit.type === 'xray'
                        ? 'X-Ray'
                        : unit.type === 'ultrasound'
                        ? 'Ultrasound'
                        : 'X-Ray + Ultrasound'}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        STATUS_COLORS[unit.status].bg
                      } ${STATUS_COLORS[unit.status].text}`}
                    >
                      {STATUS_LABELS[unit.status]}
                    </span>
                  </div>
                  {unit.currentAssignment && (
                    <div className="text-xs text-blue-600 mt-1">
                      Assigned to patient
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Online/Offline (only for available/offline) */}
                {(unit.status === 'available' || unit.status === 'offline') && (
                  <button
                    onClick={() => handleToggleStatus(unit)}
                    className={`p-2 rounded-lg transition-colors ${
                      unit.status === 'offline'
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={unit.status === 'offline' ? 'Set Available' : 'Set Offline'}
                  >
                    {unit.status === 'offline' ? (
                      <Power className="w-5 h-5" />
                    ) : (
                      <PowerOff className="w-5 h-5" />
                    )}
                  </button>
                )}

                {/* Edit (only when not assigned/imaging) */}
                {(unit.status === 'available' || unit.status === 'offline') && (
                  <button
                    onClick={() => handleOpenEdit(unit)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Edit Unit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}

                {/* Delete (only when not assigned/imaging) */}
                {(unit.status === 'available' || unit.status === 'offline') && (
                  <>
                    {deleteConfirm === unit.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(unit.id)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                          title="Confirm Delete"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(unit.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete Unit"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">No Mobile Units</h3>
          <p className="text-gray-500 text-sm mb-4">
            Add portable imaging equipment to manage assignments
          </p>
          <button onClick={handleOpenAdd} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Unit
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowAddModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">
                  {editingUnit ? 'Edit Mobile Unit' : 'Add Mobile Unit'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Portable X-ray Unit 1"
                    className="input w-full"
                    autoFocus
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equipment Type
                  </label>
                  <div className="space-y-2">
                    {UNIT_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormType(option.value)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          formType === option.value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span
                          className={
                            formType === option.value
                              ? 'text-primary-700 font-medium'
                              : 'text-gray-700'
                          }
                        >
                          {option.label}
                        </span>
                        {formType === option.value && (
                          <Check className="w-5 h-5 text-primary-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formName.trim()}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingUnit ? 'Save Changes' : 'Add Unit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
