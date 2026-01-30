import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OnboardingState {
  isActive: boolean
  currentStep: number
  completedSteps: number[]
  hasCompletedOnboarding: boolean
  // Actions
  startTutorial: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  skipTutorial: () => void
  completeTutorial: () => void
  resetTutorial: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: 0,
      completedSteps: [],
      hasCompletedOnboarding: false,

      startTutorial: () =>
        set({
          isActive: true,
          currentStep: 0,
          completedSteps: [],
        }),

      nextStep: () => {
        const { currentStep, completedSteps } = get()
        set({
          completedSteps: [...completedSteps, currentStep],
          currentStep: currentStep + 1,
        })
      },

      prevStep: () => {
        const { currentStep } = get()
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 })
        }
      },

      goToStep: (step: number) => set({ currentStep: step }),

      skipTutorial: () =>
        set({
          isActive: false,
          currentStep: 0,
          completedSteps: [],
          hasCompletedOnboarding: true,
        }),

      completeTutorial: () =>
        set({
          isActive: false,
          currentStep: 0,
          completedSteps: [],
          hasCompletedOnboarding: true,
        }),

      resetTutorial: () =>
        set({
          isActive: false,
          currentStep: 0,
          completedSteps: [],
          hasCompletedOnboarding: false,
        }),
    }),
    {
      name: 'sanad-onboarding',
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
)
