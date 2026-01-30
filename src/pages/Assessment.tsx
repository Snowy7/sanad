import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { usePatientStore } from '../store/patientStore'
import { useChatContext, AssessmentStep } from '../context/ChatContext'
import { AssessmentFormState, defaultVitals, SYMPTOMS_LIST, Symptom, ImagingRequest } from '../types'
import { calculateTriageScore } from '../lib/triageEngine'
import { Button } from '../components/ui'
import PatientInfo from '../components/Assessment/PatientInfo'
import VitalsForm from '../components/Assessment/VitalsForm'
import SymptomsChecklist from '../components/Assessment/SymptomsChecklist'
import ImagingDecision from '../components/Assessment/ImagingDecision'
import XrayUpload from '../components/Assessment/XrayUpload/index'
import VoiceRecorder from '../components/Assessment/VoiceRecorder'
import AssessmentReview from '../components/Assessment/AssessmentReview'

const ALL_STEPS = ['patient-info', 'vitals', 'symptoms', 'imaging-decision', 'xray', 'voice', 'review'] as const

export default function Assessment() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { assessments, addAssessment, updateAssessment } = usePatientStore()
  const { setContext } = useChatContext()

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
        imagingRequest: existingAssessment.imagingRequest,
        skipImaging: existingAssessment.imagingRequest?.status === 'not-needed',
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
      imagingRequest: undefined,
      skipImaging: false,
    }
  })

  const [xrayAnalysis, setXrayAnalysis] = useState(existingAssessment?.xrayAnalysis || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasSubmittedRef = useRef(false)

  // Update chat context with current step
  useEffect(() => {
    setContext({
      page: 'assessment',
      step: formState.step as AssessmentStep,
    })
  }, [formState.step, setContext])

  // Dynamic steps based on imaging decision
  const STEPS = useMemo(() => {
    if (formState.skipImaging) {
      return ALL_STEPS.filter(step => step !== 'xray')
    }
    return [...ALL_STEPS]
  }, [formState.skipImaging])

  const currentStepIndex = STEPS.indexOf(formState.step)

  const goToStep = (step: typeof ALL_STEPS[number]) => {
    setFormState((prev) => ({ ...prev, step }))
  }

  const handleImagingDecision = (request: ImagingRequest | undefined, skipImaging: boolean) => {
    setFormState((prev) => ({
      ...prev,
      imagingRequest: request,
      skipImaging,
    }))
  }

  const nextStep = () => {
    const nextIndex = Math.min(currentStepIndex + 1, STEPS.length - 1)
    goToStep(STEPS[nextIndex])
  }

  const prevStep = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0)
    goToStep(STEPS[prevIndex])
  }

  const handleSubmit = useCallback(async () => {
    console.log('[SUBMIT] Starting submission...')
    if (isSubmitting || hasSubmittedRef.current) {
      console.log('[SUBMIT] Already submitting, skipping')
      return
    }
    hasSubmittedRef.current = true
    setIsSubmitting(true)
    console.log('[SUBMIT] Set isSubmitting to true')

    const symptoms: Symptom[] = SYMPTOMS_LIST.map((s) => ({
      ...s,
      selected: formState.selectedSymptoms.includes(s.id),
    }))

    const triageScore = calculateTriageScore({
      vitals: formState.vitals,
      symptoms,
      xrayAnalysis,
    })
    console.log('[SUBMIT] Calculated triage score:', triageScore)

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
      imagingRequest: formState.imagingRequest,
    }
    console.log('[SUBMIT] Built assessment data')

    try {
      let targetId: string

      if (existingAssessment) {
        console.log('[SUBMIT] Updating existing assessment:', existingAssessment.id)
        await updateAssessment(existingAssessment.id, assessmentData)
        targetId = existingAssessment.id
        console.log('[SUBMIT] Update complete')
      } else {
        console.log('[SUBMIT] Adding new assessment...')
        targetId = await addAssessment(assessmentData)
        console.log('[SUBMIT] Add complete, got ID:', targetId)
      }

      console.log('[SUBMIT] Navigating to:', `/patient/${targetId}`)
      navigate(`/patient/${targetId}`, { replace: true })
      console.log('[SUBMIT] Navigate called')
    } catch (error) {
      console.error('[SUBMIT] Error:', error)
      alert('Failed to save assessment. Please try again.')
      hasSubmittedRef.current = false
      setIsSubmitting(false)
    }
  }, [isSubmitting, formState, xrayAnalysis, existingAssessment, updateAssessment, addAssessment, navigate])

  return (
    <div className="pb-24">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Step {currentStepIndex + 1} of {STEPS.length}</span>
          <span className="capitalize">{formState.step.replace('-', ' ')}</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
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

        {formState.step === 'imaging-decision' && (
          <ImagingDecision
            vitals={formState.vitals}
            selectedSymptoms={formState.selectedSymptoms}
            imagingRequest={formState.imagingRequest}
            onImagingDecision={handleImagingDecision}
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
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-3">
        <div className="container mx-auto max-w-4xl flex gap-2">
          {currentStepIndex > 0 && (
            <Button variant="secondary" onClick={prevStep} size="md">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          )}

          <div className="flex-1" />

          {currentStepIndex < STEPS.length - 1 ? (
            <Button variant="primary" onClick={nextStep} size="md">
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              size="md"
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
