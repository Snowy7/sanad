import { AlertTriangle } from 'lucide-react'

export default function MedicalDisclaimer() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 p-2 rounded-lg shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-medium text-amber-800 mb-1">Medical Disclaimer</p>
          <p className="text-sm text-amber-700">
            SANAD is designed to assist trained medical professionals during disaster response.
            AI recommendations are advisory only and do not replace clinical judgment.
            Always follow established medical protocols and guidelines.
          </p>
        </div>
      </div>
    </div>
  )
}
