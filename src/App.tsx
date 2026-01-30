import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Assessment from './pages/Assessment'
import Queue from './pages/Queue'
import PatientDetail from './pages/PatientDetail'
import Settings from './pages/Settings'
import LandingPage from './pages/LandingPage'
import { useFirstVisit } from './hooks/useFirstVisit'
import { usePatientStore } from './store/patientStore'

function App() {
  const { isFirstVisit, completeFirstVisit } = useFirstVisit()
  const { initialize, isLoading, isInitialized } = usePatientStore()

  // Initialize Firebase connection on app start
  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [initialize, isInitialized])

  // Show landing page on first visit
  if (isFirstVisit) {
    return <LandingPage onGetStarted={completeFirstVisit} />
  }

  // Show loading state while Firebase initializes
  if (isLoading && !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/assessment/:patientId" element={<Assessment />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/patient/:patientId" element={<PatientDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App
