import { useEffect } from 'react'
import OnboardingOverlay from './OnboardingOverlay'
import { useOnboardingStore } from '../../store/onboardingStore'

interface OnboardingProviderProps {
  children: React.ReactNode
  autoStart?: boolean
}

export default function OnboardingProvider({ children, autoStart = false }: OnboardingProviderProps) {
  const { isActive, hasCompletedOnboarding, startTutorial } = useOnboardingStore()

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (autoStart && !hasCompletedOnboarding && !isActive) {
      // Small delay to ensure app is fully rendered
      const timer = setTimeout(() => {
        startTutorial()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [autoStart, hasCompletedOnboarding, isActive, startTutorial])

  return (
    <>
      {children}
      <OnboardingOverlay />
    </>
  )
}
