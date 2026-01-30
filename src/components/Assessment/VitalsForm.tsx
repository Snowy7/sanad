import { Activity, Heart, Wind, Thermometer, Droplets } from 'lucide-react'
import { Vitals } from '../../types'

interface VitalsFormProps {
  vitals: Vitals
  onChange: (vitals: Vitals) => void
}

const vitalFields = [
  {
    key: 'bloodPressureSystolic' as const,
    label: 'Systolic BP',
    icon: Activity,
    unit: 'mmHg',
    placeholder: '120',
    min: 50,
    max: 250,
  },
  {
    key: 'bloodPressureDiastolic' as const,
    label: 'Diastolic BP',
    icon: Activity,
    unit: 'mmHg',
    placeholder: '80',
    min: 30,
    max: 150,
  },
  {
    key: 'heartRate' as const,
    label: 'Heart Rate',
    icon: Heart,
    unit: 'bpm',
    placeholder: '72',
    min: 20,
    max: 250,
  },
  {
    key: 'respiratoryRate' as const,
    label: 'Respiratory Rate',
    icon: Wind,
    unit: '/min',
    placeholder: '16',
    min: 4,
    max: 60,
  },
  {
    key: 'oxygenSaturation' as const,
    label: 'SpO2',
    icon: Droplets,
    unit: '%',
    placeholder: '98',
    min: 50,
    max: 100,
  },
  {
    key: 'temperature' as const,
    label: 'Temperature',
    icon: Thermometer,
    unit: '°C',
    placeholder: '37.0',
    min: 30,
    max: 45,
    step: 0.1,
  },
]

export default function VitalsForm({ vitals, onChange }: VitalsFormProps) {
  const handleChange = (key: keyof Vitals, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    onChange({ ...vitals, [key]: numValue })
  }

  const getVitalStatus = (key: keyof Vitals, value: number | null) => {
    if (value === null) return 'normal'

    switch (key) {
      case 'bloodPressureSystolic':
        if (value < 90 || value > 180) return 'critical'
        if (value < 100 || value > 140) return 'warning'
        return 'normal'
      case 'bloodPressureDiastolic':
        if (value < 60 || value > 120) return 'critical'
        if (value < 60 || value > 90) return 'warning'
        return 'normal'
      case 'heartRate':
        if (value < 40 || value > 150) return 'critical'
        if (value < 50 || value > 100) return 'warning'
        return 'normal'
      case 'respiratoryRate':
        if (value < 8 || value > 30) return 'critical'
        if (value < 12 || value > 20) return 'warning'
        return 'normal'
      case 'oxygenSaturation':
        if (value < 90) return 'critical'
        if (value < 95) return 'warning'
        return 'normal'
      case 'temperature':
        if (value < 35 || value > 40) return 'critical'
        if (value < 36 || value > 38) return 'warning'
        return 'normal'
      default:
        return 'normal'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary-100 p-3 rounded-xl">
          <Activity className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vital Signs</h2>
          <p className="text-sm text-gray-500">Record current vital measurements</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-onboarding="vitals-form">
        {vitalFields.map((field) => {
          const Icon = field.icon
          const status = getVitalStatus(field.key, vitals[field.key])
          const statusColors = {
            normal: 'border-gray-200 bg-white',
            warning: 'border-amber-300 bg-amber-50',
            critical: 'border-red-300 bg-red-50',
          }

          return (
            <div
              key={field.key}
              className={`rounded-2xl p-4 border ${statusColors[status]} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-600">
                  {field.label}
                </label>
              </div>
              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  className="w-full text-2xl font-semibold bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.step || 1}
                  value={vitals[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
                <span className="text-sm text-gray-500">{field.unit}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-sm text-gray-500 text-center">
        Leave blank if measurement is not available
      </div>
    </div>
  )
}
