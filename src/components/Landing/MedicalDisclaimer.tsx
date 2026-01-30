import { AlertTriangle } from 'lucide-react'

export default function MedicalDisclaimer() {
  return (
    <div className="glass-dark rounded-xl p-4 border-amber-500/30">
      <div className="flex items-start gap-3">
        <div className="bg-amber-500/20 p-2 rounded-lg shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <p className="font-medium text-amber-400 mb-1">Medical Disclaimer</p>
          <p className="text-sm text-slate-400">
            SANAD is designed to assist trained medical professionals during disaster response.
            AI recommendations are advisory only and do not replace clinical judgment.
            Always follow established medical protocols and guidelines.
          </p>
        </div>
      </div>
    </div>
  )
}
