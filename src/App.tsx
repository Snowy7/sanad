import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Assessment from './pages/Assessment'
import Queue from './pages/Queue'
import PatientDetail from './pages/PatientDetail'
import LandingPage from './pages/LandingPage'
import { useFirstVisit } from './hooks/useFirstVisit'

function App() {
  const { isFirstVisit, completeFirstVisit } = useFirstVisit()

  // Show landing page on first visit
  if (isFirstVisit) {
    return <LandingPage onGetStarted={completeFirstVisit} />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/assessment/:patientId" element={<Assessment />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/patient/:patientId" element={<PatientDetail />} />
      </Routes>
    </Layout>
  )
}

export default App
