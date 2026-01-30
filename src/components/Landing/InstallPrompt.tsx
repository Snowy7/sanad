import { useState, useEffect } from 'react'
import { Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Install prompt error:', error)
    }
  }

  if (isInstalled) {
    return (
      <div className="glass-dark rounded-xl p-4 flex items-center gap-3">
        <div className="bg-green-500/20 p-2 rounded-lg">
          <Smartphone className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <p className="font-medium text-green-400">App Installed</p>
          <p className="text-sm text-slate-400">SANAD is ready to work offline</p>
        </div>
      </div>
    )
  }

  if (deferredPrompt) {
    return (
      <button
        onClick={handleInstall}
        className="w-full glass-dark hover:bg-slate-700/80 rounded-xl p-4 flex items-center justify-center gap-3 transition-colors"
      >
        <Download className="w-5 h-5 text-primary-400" />
        <span className="font-medium text-white">Install App for Offline Use</span>
      </button>
    )
  }

  // Show instructions for manual installation
  return (
    <div className="glass-dark rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-slate-700 p-2 rounded-lg">
          <Download className="w-5 h-5 text-slate-300" />
        </div>
        <p className="font-medium text-white">Install for Offline Use</p>
      </div>
      <p className="text-sm text-slate-400">
        Add to Home Screen from your browser menu for the best offline experience.
      </p>
    </div>
  )
}
