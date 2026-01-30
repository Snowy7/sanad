import { useState } from 'react'
import { Stethoscope, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { SYMPTOMS_LIST, Symptom } from '../../types'

interface SymptomsChecklistProps {
  selectedSymptoms: string[]
  onChange: (symptoms: string[]) => void
}

const categories = [
  { id: 'respiratory', label: 'Respiratory', color: 'bg-blue-100 text-blue-700' },
  { id: 'cardiovascular', label: 'Cardiovascular', color: 'bg-red-100 text-red-700' },
  { id: 'neurological', label: 'Neurological', color: 'bg-purple-100 text-purple-700' },
  { id: 'trauma', label: 'Trauma', color: 'bg-orange-100 text-orange-700' },
  { id: 'general', label: 'General', color: 'bg-gray-100 text-gray-700' },
] as const

export default function SymptomsChecklist({
  selectedSymptoms,
  onChange,
}: SymptomsChecklistProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const toggleSymptom = (symptomId: string) => {
    if (selectedSymptoms.includes(symptomId)) {
      onChange(selectedSymptoms.filter((id) => id !== symptomId))
    } else {
      onChange([...selectedSymptoms, symptomId])
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId)
  }

  const getCategorySymptoms = (categoryId: string): Symptom[] => {
    return SYMPTOMS_LIST.filter((s) => s.category === categoryId)
  }

  const getSelectedCountForCategory = (categoryId: string): number => {
    return getCategorySymptoms(categoryId).filter((s) =>
      selectedSymptoms.includes(s.id)
    ).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary-100 p-3 rounded-xl">
          <Stethoscope className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Symptoms</h2>
          <p className="text-sm text-gray-500">
            Select all presenting symptoms ({selectedSymptoms.length} selected)
          </p>
        </div>
      </div>

      <div className="space-y-3" data-onboarding="symptoms-checklist">
        {categories.map((category) => {
          const symptoms = getCategorySymptoms(category.id)
          const selectedCount = getSelectedCountForCategory(category.id)
          const isExpanded = expandedCategory === category.id

          return (
            <div key={category.id} className="card p-0 overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${category.color}`}
                  >
                    {category.label}
                  </span>
                  {selectedCount > 0 && (
                    <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {selectedCount} selected
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-2">
                  {symptoms.map((symptom) => {
                    const isSelected = selectedSymptoms.includes(symptom.id)
                    const severityColor =
                      symptom.severity >= 8
                        ? 'text-red-600'
                        : symptom.severity >= 5
                        ? 'text-amber-600'
                        : 'text-gray-500'

                    return (
                      <button
                        key={symptom.id}
                        onClick={() => toggleSymptom(symptom.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          isSelected
                            ? 'bg-primary-50 border-2 border-primary-300'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        <span
                          className={`flex-1 text-left font-medium ${
                            isSelected ? 'text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {symptom.name}
                        </span>
                        <span className={`text-xs font-medium ${severityColor}`}>
                          Sev: {symptom.severity}/10
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick selection for critical symptoms */}
      <div className="card bg-red-50 border-red-200">
        <h3 className="font-semibold text-red-700 mb-3">Critical Symptoms</h3>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS_LIST.filter((s) => s.severity >= 9).map((symptom) => {
            const isSelected = selectedSymptoms.includes(symptom.id)
            return (
              <button
                key={symptom.id}
                onClick={() => toggleSymptom(symptom.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-red-600 border border-red-200 hover:bg-red-100'
                }`}
              >
                {symptom.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
