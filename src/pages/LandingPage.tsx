import { useState, useRef, useEffect } from 'react'
import {
  ArrowRight,
  Volume2,
  VolumeX,
  ChevronDown,
  AlertTriangle,
  Clock,
  Users,
  WifiOff,
  Brain,
  Zap,
  Shield,
  ImageIcon,
  Scan,
  Activity
} from 'lucide-react'

interface LandingPageProps {
  onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  const scrollToContent = () => {
    document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/video/4min-pitch.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-3 tracking-tight">
            SANAD
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-2 font-medium">
            Smart AI Nurse Assistant for Disaster
          </p>
          <p className="text-base text-white/70 mb-8 max-w-xl mx-auto">
            AI-powered medical triage that works completely offline
          </p>

          <button
            onClick={onGetStarted}
            className="bg-white text-gray-900 font-semibold px-8 py-3.5 rounded-full hover:bg-gray-100 transition-all shadow-xl inline-flex items-center gap-2"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute bottom-6 right-6 z-20 bg-white/10 backdrop-blur-sm p-2.5 rounded-full hover:bg-white/20 transition-all"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={scrollToContent}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-white/60 hover:text-white transition-colors animate-bounce"
        >
          <ChevronDown className="w-7 h-7" />
        </button>
      </section>

      {/* Problem Statement */}
      <section id="problem" className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-primary-600 font-semibold mb-2 uppercase tracking-wide text-sm">The Problem</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              When disasters strike, every second counts
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Medical professionals face overwhelming patient volumes with limited resources.
              Communication infrastructure often fails when needed most.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ProblemCard icon={Clock} color="text-red-500" title="Time Critical" description="Delayed decisions cost lives" />
            <ProblemCard icon={Users} color="text-amber-500" title="Mass Casualties" description="Overwhelmed staff" />
            <ProblemCard icon={WifiOff} color="text-gray-500" title="No Connectivity" description="Networks fail first" />
            <ProblemCard icon={AlertTriangle} color="text-orange-500" title="High Stakes" description="Wrong priorities harm" />
          </div>
        </div>
      </section>

      {/* Solution & Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-primary-600 font-semibold mb-2 uppercase tracking-wide text-sm">The Solution</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              AI-Powered Triage in Your Pocket
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              SANAD brings artificial intelligence to disaster response,
              running entirely on your device without any internet connection.
            </p>
          </div>

          {/* Key Features Grid */}
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            <FeatureCard
              icon={Brain}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              title="Smart Analysis"
              description="AI evaluates vitals, symptoms, and X-rays to calculate triage scores automatically"
            />
            <FeatureCard
              icon={WifiOff}
              iconBg="bg-green-50"
              iconColor="text-green-600"
              title="Fully Offline"
              description="All AI models run locally. No internet, no cloud, no dependencies"
            />
            <FeatureCard
              icon={Zap}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              title="Instant Results"
              description="Get triage recommendations in seconds, not minutes"
            />
          </div>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-4">
            <FeatureHighlight
              icon={ImageIcon}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              title="X-Ray Analysis"
              items={['14 pathology detection', 'Heatmap visualization', 'Confidence scores']}
            />
            <FeatureHighlight
              icon={Activity}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              title="Smart Triage"
              items={['4-level priority system', 'Transparent scoring', 'Clinician override']}
            />
            <FeatureHighlight
              icon={Scan}
              iconBg="bg-cyan-100"
              iconColor="text-cyan-600"
              title="Imaging Priority"
              items={['Smart urgency scoring', 'Mobile unit workflow', 'Resource allocation']}
            />
          </div>
        </div>
      </section>

      {/* Offline Banner */}
      <section className="py-12 px-4 bg-primary-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center gap-8 mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 opacity-80" />
              <span className="text-sm">Private & Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 opacity-80" />
              <span className="text-sm">Works Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 opacity-80" />
              <span className="text-sm">Always Ready</span>
            </div>
          </div>
          <p className="text-white/70 text-sm max-w-xl mx-auto">
            Patient data never leaves your device. No internet required, no single point of failure.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 mb-8">
            Join medical professionals using SANAD to improve triage efficiency in disaster response.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-primary-600 text-white font-semibold px-10 py-3.5 rounded-full hover:bg-primary-700 transition-all shadow-lg inline-flex items-center gap-2"
          >
            Launch Application
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>AI recommendations are advisory only. Clinical judgment required.</span>
          </div>
          <p className="text-gray-400 text-xs">
            Designed for medical professionals in disaster response
          </p>
        </div>
      </footer>
    </div>
  )
}

function ProblemCard({
  icon: Icon,
  color,
  title,
  description,
}: {
  icon: React.ElementType
  color: string
  title: string
  description: string
}) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <Icon className={`w-8 h-8 ${color} mb-2`} />
      <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  description: string
}) {
  return (
    <div className="text-center p-5">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

function FeatureHighlight({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  items,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  items: string[]
}) {
  return (
    <div className="bg-gray-50 p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
            <div className={`w-1 h-1 ${iconBg.replace('50', '500').replace('100', '500')} rounded-full`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
