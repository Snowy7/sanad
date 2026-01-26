import { Image as ImageIcon, Mic, WifiOff, Activity, ArrowRight, Shield } from 'lucide-react'
import InstallPrompt from '../components/Landing/InstallPrompt'
import MedicalDisclaimer from '../components/Landing/MedicalDisclaimer'

interface LandingPageProps {
  onGetStarted: () => void
}

const FEATURES = [
  {
    icon: ImageIcon,
    title: 'X-Ray Analysis',
    description: 'AI-powered chest X-ray analysis with pathology detection and heatmap visualization',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Mic,
    title: 'Voice Notes',
    description: 'Record voice observations with automatic transcription using Whisper AI',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: WifiOff,
    title: 'Works Offline',
    description: 'Full functionality without internet. AI models run locally on your device',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Activity,
    title: 'Smart Triage',
    description: 'Automatic priority scoring based on vitals, symptoms, and imaging analysis',
    color: 'bg-red-100 text-red-600',
  },
]

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SANAD
          </h1>
          <p className="text-lg text-primary-700 font-medium mb-2">
            Smart AI Nurse Assistant for Disaster
          </p>
          <p className="text-gray-600">
            AI-powered medical triage for disaster response.
            Works completely offline.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${feature.color}`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {feature.title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Install Prompt */}
        <div className="mb-6">
          <InstallPrompt />
        </div>

        {/* Medical Disclaimer */}
        <div className="mb-8">
          <MedicalDisclaimer />
        </div>

        {/* Get Started Button */}
        <button
          onClick={onGetStarted}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-200"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Designed for medical professionals in disaster response scenarios
        </p>
      </div>
    </div>
  )
}
