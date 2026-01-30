import { useEffect, useState, useCallback, useRef } from 'react'
import { X, ChevronRight, ChevronLeft, SkipForward, Loader2 } from 'lucide-react'
import { useOnboardingStore } from '../../store/onboardingStore'
import { onboardingSteps, TOTAL_STEPS } from './onboardingSteps'
import { useNavigate, useLocation } from 'react-router-dom'

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

export default function OnboardingOverlay() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isActive,
    currentStep,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
  } = useOnboardingStore()

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [isNavigating, setIsNavigating] = useState(false)
  const [elementFound, setElementFound] = useState(false)
  const actionCompletedRef = useRef(false)

  const step = onboardingSteps[currentStep]
  const isLastStep = currentStep === TOTAL_STEPS - 1
  const isFirstStep = currentStep === 0

  // Check if we're waiting for an element
  const isWaitingForElement = step?.waitForElement && !elementFound

  // Find and measure target element
  const updateTargetPosition = useCallback(() => {
    if (!step) return

    const target = document.querySelector(`[data-onboarding="${step.target}"]`)
    if (target) {
      setElementFound(true)
      const rect = target.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })

      // Calculate tooltip position
      const padding = 16
      const tooltipWidth = 320
      const tooltipHeight = 220
      let top = 0
      let left = 0

      switch (step.position) {
        case 'center':
          top = window.innerHeight / 2 - tooltipHeight / 2
          left = window.innerWidth / 2 - tooltipWidth / 2
          break
        case 'top':
          top = rect.top - tooltipHeight - padding
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'bottom':
          top = rect.bottom + padding
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.left - tooltipWidth - padding
          break
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.right + padding
          break
      }

      // Keep tooltip within viewport
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding))
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding))

      setTooltipPosition({ top, left })
    } else {
      setElementFound(false)
      setTargetRect(null)
      // Position tooltip at top-right corner when waiting
      setTooltipPosition({
        top: 80,
        left: window.innerWidth - 340,
      })
    }
  }, [step])

  // Navigate to correct route for current step
  useEffect(() => {
    if (!isActive || !step) return

    if (step.route && location.pathname !== step.route) {
      setIsNavigating(true)
      navigate(step.route)
      setTimeout(() => {
        setIsNavigating(false)
        updateTargetPosition()
      }, 300)
    }
  }, [isActive, step, location.pathname, navigate, updateTargetPosition])

  // Reset element found state on step change
  useEffect(() => {
    setElementFound(false)
    actionCompletedRef.current = false
  }, [currentStep])

  // Update target position on step change and window events
  useEffect(() => {
    if (!isActive) return

    const timer = setTimeout(updateTargetPosition, 150)

    const handleUpdate = () => updateTargetPosition()
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)

    // Poll for element (especially important when waitForElement is true)
    const pollInterval = setInterval(updateTargetPosition, 300)

    return () => {
      clearTimeout(timer)
      clearInterval(pollInterval)
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
    }
  }, [isActive, currentStep, updateTargetPosition])

  // Handle keyboard shortcuts (but not when typing in inputs)
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }

      if (e.key === 'Escape') {
        skipTutorial()
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        prevStep()
      } else if (e.key === 'ArrowRight' && !isLastStep && !step?.actionRequired) {
        nextStep()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, isLastStep, isFirstStep, nextStep, prevStep, skipTutorial, step])

  // Advance to next step
  const advanceToNextStep = useCallback(() => {
    if (actionCompletedRef.current) return
    actionCompletedRef.current = true

    setTimeout(() => {
      if (isLastStep) {
        completeTutorial()
      } else {
        nextStep()
      }
    }, 300)
  }, [isLastStep, completeTutorial, nextStep])

  // Handle action completion based on action type
  useEffect(() => {
    if (!isActive || !step?.actionRequired || !elementFound) return

    const target = document.querySelector(`[data-onboarding="${step.target}"]`)
    if (!target) return

    if (step.actionRequired === 'click') {
      const handleClick = () => advanceToNextStep()
      target.addEventListener('click', handleClick)
      return () => target.removeEventListener('click', handleClick)
    }

    if (step.actionRequired === 'select') {
      const handleClick = (e: Event) => {
        const clickedEl = e.target as HTMLElement
        if (clickedEl.closest('button')) {
          advanceToNextStep()
        }
      }
      target.addEventListener('click', handleClick)
      return () => target.removeEventListener('click', handleClick)
    }

    if (step.actionRequired === 'view') {
      const timer = setTimeout(advanceToNextStep, 3000)
      return () => clearTimeout(timer)
    }

    // For input steps with waitForElement, don't auto-advance
    // The user will use the app's own navigation, and we detect element change
  }, [isActive, step, currentStep, elementFound, advanceToNextStep])

  // Auto-advance when element disappears (user navigated via app) for waitForElement steps
  useEffect(() => {
    if (!isActive || !step?.waitForElement || !elementFound) return

    // Check if element has disappeared (meaning user used app navigation)
    const checkElementGone = () => {
      const target = document.querySelector(`[data-onboarding="${step.target}"]`)
      if (!target) {
        // Element is gone, advance to next step
        advanceToNextStep()
      }
    }

    // Poll to detect when element disappears
    const interval = setInterval(checkElementGone, 200)

    return () => clearInterval(interval)
  }, [isActive, step, elementFound, advanceToNextStep])

  if (!isActive || !step || isNavigating) return null

  const showSpotlight = elementFound && targetRect && step.position !== 'center'
  const spotlightPadding = 12

  // Calculate the four backdrop rectangles around the spotlight
  const getBackdropRects = () => {
    if (!targetRect) return null

    const spotlight = {
      top: targetRect.top - spotlightPadding,
      left: targetRect.left - spotlightPadding,
      width: targetRect.width + spotlightPadding * 2,
      height: targetRect.height + spotlightPadding * 2,
    }

    return {
      top: { top: 0, left: 0, width: '100%', height: Math.max(0, spotlight.top) },
      bottom: { top: spotlight.top + spotlight.height, left: 0, width: '100%', height: Math.max(0, window.innerHeight - (spotlight.top + spotlight.height)) },
      left: { top: spotlight.top, left: 0, width: Math.max(0, spotlight.left), height: spotlight.height },
      right: { top: spotlight.top, left: spotlight.left + spotlight.width, width: Math.max(0, window.innerWidth - (spotlight.left + spotlight.width)), height: spotlight.height },
    }
  }

  const backdropRects = showSpotlight ? getBackdropRects() : null

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop - only show when element is found */}
      {!isWaitingForElement && (
        <>
          {showSpotlight && backdropRects ? (
            <>
              {Object.entries(backdropRects).map(([key, rect]) => (
                <div
                  key={key}
                  className="fixed bg-black/75 pointer-events-auto"
                  style={{
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                  }}
                  onClick={skipTutorial}
                />
              ))}
            </>
          ) : (
            <div
              className="absolute inset-0 bg-black/75 pointer-events-auto"
              onClick={skipTutorial}
            />
          )}
        </>
      )}

      {/* Spotlight border/highlight */}
      {showSpotlight && targetRect && (
        <div
          className="fixed pointer-events-none rounded-xl"
          style={{
            top: targetRect.top - spotlightPadding,
            left: targetRect.left - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
          }}
        >
          <div className="absolute inset-0 rounded-xl border-2 border-primary-400" />
          <div className="absolute inset-0 rounded-xl ring-4 ring-primary-400/30 animate-pulse" />
        </div>
      )}

      {/* Tooltip */}
      <div
        className={`fixed pointer-events-auto bg-white rounded-xl shadow-2xl p-5 w-80 transition-all duration-300 ${
          isWaitingForElement ? 'border-2 border-primary-200' : ''
        }`}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          zIndex: 101,
        }}
      >
        {/* Close button */}
        <button
          onClick={skipTutorial}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close tutorial"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="flex gap-1.5 mb-4">
          {onboardingSteps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full flex-1 transition-colors ${
                idx < currentStep
                  ? 'bg-primary-600'
                  : idx === currentStep
                  ? 'bg-primary-400'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-6">
          {step.title}
        </h3>

        {isWaitingForElement && step.waitHint ? (
          // Waiting state
          <div className="mb-4">
            <p className="text-gray-600 text-sm mb-3 leading-relaxed">
              {step.waitHint}
            </p>
            <div className="flex items-center gap-2 text-primary-600 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for you to proceed...</span>
            </div>
          </div>
        ) : (
          // Normal state
          <>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              {step.description}
            </p>

            {step.actionHint && (
              <p className="text-primary-600 text-xs font-medium mb-4 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                {step.actionHint}
              </p>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={skipTutorial}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <SkipForward className="w-4 h-4" />
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Previous step"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Show Next button when element is found and it's not a click/select action */}
            {elementFound && (!step.actionRequired || step.actionRequired === 'input' || step.actionRequired === 'view') && (
              <button
                onClick={isLastStep ? completeTutorial : advanceToNextStep}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-1"
              >
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Step counter */}
        <p className="text-center text-xs text-gray-400 mt-3">
          Step {currentStep + 1} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  )
}
