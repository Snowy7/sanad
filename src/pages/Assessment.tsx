import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { usePatientStore } from '../store/patientStore'
import { AssessmentFormState, defaultVitals, SYMPTOMS_LIST, Symptom } from '../types'
import { calculateTriageScore } from '../lib/triageEngine'
import PatientInfo from '../components/Assessment/PatientInfo'
import VitalsForm from '../components/Assessment/VitalsForm'
import SymptomsChecklist from '../components/Assessment/SymptomsChecklist'
import XrayUpload from '../components/Assessment/XrayUpload'
import VoiceRecorder from '../components/Assessment/VoiceRecorder'
import AssessmentReview from '../components/Assessment/AssessmentReview'

const STEPS = ['patient-info', 'vitals', 'symptoms', 'xray', 'voice', 'review'] as const

export default function Assessment() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { assessments, addAssessment, updateAssessment } = usePatientStore()

  const existingAssessment = patientId
    ? assessments.find((a) => a.id === patientId)
    : null

  const [formState, setFormState] = useState<AssessmentFormState>(() => {
    if (existingAssessment) {
      return {
        step: 'patient-info',
        patient: existingAssessment.patient,
        vitals: existingAssessment.vitals,
        selectedSymptoms: existingAssessment.symptoms
          .filter((s) => s.selected)
          .map((s) => s.id),
        xrayImage: null,
        voiceNotes: existingAssessment.voiceNotes,
        additionalNotes: existingAssessment.additionalNotes,
      }
    }
    return {
      step: 'patient-info',
      patient: {},
      vitals: defaultVitals,
      selectedSymptoms: [],
      xrayImage: null,
      voiceNotes: [],
      additionalNotes: '',
    }
  })

  const [xrayAnalysis, setXrayAnalysis] = useState(existingAssessment?.xrayAnalysis || null)

  const currentStepIndex = STEPS.indexOf(formState.step)

  const goToStep = (step: typeof STEPS[number]) => {
    setFormState((prev) => ({ ...prev, step }))
  }

  const nextStep = () => {
    const nextIndex = Math.min(currentStepIndex + 1, STEPS.length - 1)
    goToStep(STEPS[nextIndex])
  }

  const prevStep = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0)
    goToStep(STEPS[prevIndex])
  }

  const handleSubmit = () => {
    const symptoms: Symptom[] = SYMPTOMS_LIST.map((s) => ({
      ...s,
      selected: formState.selectedSymptoms.includes(s.id),
    }))

    const triageScore = calculateTriageScore({
      vitals: formState.vitals,
      symptoms,
      xrayAnalysis,
    })

    const assessmentData = {
      patient: {
        id: existingAssessment?.patient.id || crypto.randomUUID(),
        name: formState.patient.name || 'Unknown',
        age: formState.patient.age || 0,
        gender: formState.patient.gender || 'other',
        chiefComplaint: formState.patient.chiefComplaint || '',
        createdAt: existingAssessment?.patient.createdAt || new Date(),
        updatedAt: new Date(),
      },
      vitals: formState.vitals,
      symptoms,
      xrayAnalysis,
      voiceNotes: formState.voiceNotes,
      additionalNotes: formState.additionalNotes,
      triageScore,
    }

    if (existingAssessment) {
      updateAssessment(existingAssessment.id, assessmentData)
      navigate(`/patient/${existingAssessment.id}`)
    } else {
      const newId = addAssessment(assessmentData)
      navigate(`/patient/${newId}`)
    }
  }

  return (
    <div className="pb-24">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Step {currentStepIndex + 1} of {STEPS.length}</span>
          <span className="capitalize">{formState.step.replace('-', ' ')}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {formState.step === 'patient-info' && (
          <PatientInfo
            patient={formState.patient}
            onChange={(patient) => setFormState((prev) => ({ ...prev, patient: { ...prev.patient, ...patient } }))}
          />
        )}

        {formState.step === 'vitals' && (
          <VitalsForm
            vitals={formState.vitals}
            onChange={(vitals) => setFormState((prev) => ({ ...prev, vitals }))}
          />
        )}

        {formState.step === 'symptoms' && (
          <SymptomsChecklist
            selectedSymptoms={formState.selectedSymptoms}
            onChange={(selectedSymptoms) => setFormState((prev) => ({ ...prev, selectedSymptoms }))}
          />
        )}

        {formState.step === 'xray' && (
          <XrayUpload
            image={formState.xrayImage}
            analysis={xrayAnalysis}
            onImageChange={(image) => setFormState((prev) => ({ ...prev, xrayImage: image }))}
            onAnalysisComplete={setXrayAnalysis}
          />
        )}

        {formState.step === 'voice' && (
          <VoiceRecorder
            notes={formState.voiceNotes}
            onChange={(voiceNotes) => setFormState((prev) => ({ ...prev, voiceNotes }))}
            additionalNotes={formState.additionalNotes}
            onNotesChange={(additionalNotes) => setFormState((prev) => ({ ...prev, additionalNotes }))}
          />
        )}

        {formState.step === 'review' && (
          <AssessmentReview
            formState={formState}
            xrayAnalysis={xrayAnalysis}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="container mx-auto max-w-4xl flex gap-3">
          {currentStepIndex > 0 && (
            <button onClick={prevStep} className="btn-secondary flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          )}

          <div className="flex-1" />

          {currentStepIndex < STEPS.length - 1 ? (
            <button onClick={nextStep} className="btn-primary flex items-center gap-2">
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={handleSubmit} className="btn-primary flex items-center gap-2">
              <Check className="w-5 h-5" />
              Complete Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
