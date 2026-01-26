import { useState, useCallback } from 'react'

const FIRST_VISIT_KEY = 'sanad-first-visit-completed'

export function useFirstVisit() {
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(() => {
    // Check if this is the first visit
    return !localStorage.getItem(FIRST_VISIT_KEY)
  })

  const completeFirstVisit = useCallback(() => {
    localStorage.setItem(FIRST_VISIT_KEY, 'true')
    setIsFirstVisit(false)
  }, [])

  const resetFirstVisit = useCallback(() => {
    localStorage.removeItem(FIRST_VISIT_KEY)
    setIsFirstVisit(true)
  }, [])

  return {
    isFirstVisit,
    completeFirstVisit,
    resetFirstVisit,
  }
}
