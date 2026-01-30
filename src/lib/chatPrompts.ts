// System prompts for contextual AI chat
import { Assessment } from '../types'
import { ChatPage, AssessmentStep } from '../context/ChatContext'

// Base system prompt for SANAD AI
const BASE_PROMPT = `You are SANAD AI, a medical triage assistant integrated into a field medical triage system. Your role is to assist healthcare professionals with:
- Triage decisions and priority assessments
- Interpreting vital signs and symptoms
- Providing clinical guidance and recommendations
- Answering medical questions within your knowledge

Important guidelines:
- Always emphasize that AI suggestions are for decision support only
- Clinical judgment and physician oversight are essential
- Be concise and practical in field medicine contexts
- Acknowledge uncertainty when appropriate
- Never provide definitive diagnoses - suggest possibilities for clinical correlation`

// Patient context template
function getPatientContext(patient: Assessment): string {
  const vitals = patient.vitals
  const symptoms = patient.symptoms.filter((s) => s.selected).map((s) => s.name)
  const triage = patient.triageScore

  let context = `\n\n## Current Patient Context
**Name:** ${patient.patient.name || 'Unknown'}
**Age:** ${patient.patient.age || 'Unknown'} years
**Gender:** ${patient.patient.gender || 'Unknown'}
**Chief Complaint:** ${patient.patient.chiefComplaint || 'Not specified'}`

  if (vitals) {
    const vitalValues = []
    if (vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic) {
      vitalValues.push(`BP ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg`)
    }
    if (vitals.heartRate) vitalValues.push(`HR ${vitals.heartRate} bpm`)
    if (vitals.oxygenSaturation) vitalValues.push(`SpO2 ${vitals.oxygenSaturation}%`)
    if (vitals.temperature) vitalValues.push(`Temp ${vitals.temperature}°C`)
    if (vitals.respiratoryRate) vitalValues.push(`RR ${vitals.respiratoryRate}/min`)

    if (vitalValues.length > 0) {
      context += `\n**Vitals:** ${vitalValues.join(', ')}`
    }
  }

  if (symptoms.length > 0) {
    context += `\n**Symptoms:** ${symptoms.join(', ')}`
  }

  if (triage) {
    context += `\n**Triage Priority:** ${triage.priority.toUpperCase()} (Score: ${triage.score}/100)`
    context += `\n**Recommendation:** ${triage.recommendation}`
  }

  if (patient.xrayAnalysis?.vlmAnalysis) {
    const vlm = patient.xrayAnalysis.vlmAnalysis
    context += `\n**X-ray Analysis:** ${vlm.severity} severity`
    if (vlm.impressions.length > 0) {
      context += `\n**Key Findings:** ${vlm.impressions.slice(0, 3).join('; ')}`
    }
  }

  return context
}

// Page-specific context additions
const PAGE_CONTEXTS: Record<ChatPage, string> = {
  home: `\n\nYou are on the home/dashboard page. Help with general triage questions, system explanations, or getting started with assessments.`,
  assessment: `\n\nYou are assisting with a patient assessment. Help with data entry, interpreting values as they're entered, and guiding through the assessment process.`,
  queue: `\n\nYou are viewing the patient queue. Help with understanding triage priorities, queue management, and identifying which patients need immediate attention.`,
  'patient-detail': `\n\nYou are viewing a specific patient's details. Help with interpreting their assessment, suggesting next steps, and answering questions about their condition.`,
  imaging: `\n\nYou are in the imaging queue section. Help with understanding imaging priorities, scan interpretations, and mobile unit coordination.`,
  settings: `\n\nYou are in the settings area. Help with configuration questions, system setup, and technical assistance.`,
}

// Step-specific context for assessment
const STEP_CONTEXTS: Record<AssessmentStep, string> = {
  'patient-info': `You're helping collect basic patient information. Guide on what demographic data is important for triage.`,
  vitals: `You're helping record vital signs. Be ready to explain normal ranges, concerning values, and what abnormalities might indicate.`,
  symptoms: `You're helping document symptoms. Help identify concerning symptom combinations and severity indicators.`,
  'imaging-decision': `You're helping decide on imaging needs. Explain when X-rays or ultrasounds are indicated based on symptoms and presentation.`,
  xray: `You're in the X-ray analysis section. Help interpret X-ray findings and answer questions about the images.`,
  voice: `You're helping with voice notes. Summarize or clarify verbal observations being recorded.`,
  review: `You're reviewing the complete assessment. Help verify all data is complete and the triage score is appropriate.`,
}

export function getSystemPrompt(
  page: ChatPage,
  step?: AssessmentStep,
  patient?: Assessment
): string {
  let prompt = BASE_PROMPT

  // Add patient context if available
  if (patient) {
    prompt += getPatientContext(patient)
  }

  // Add page context
  prompt += PAGE_CONTEXTS[page]

  // Add step context if in assessment
  if (page === 'assessment' && step) {
    prompt += `\n\n**Current Step:** ${STEP_CONTEXTS[step]}`
  }

  prompt += `\n\nRespond concisely and practically. Keep responses under 200 words unless detailed explanation is needed.`

  return prompt
}

// Quick suggestions by context
export interface QuickSuggestion {
  text: string
  query: string
}

const HOME_SUGGESTIONS: QuickSuggestion[] = [
  { text: 'What do triage priorities mean?', query: 'Explain the four triage priority levels (immediate, urgent, delayed, minimal) and what criteria determine each.' },
  { text: 'How does AI analysis work?', query: 'How does the AI triage scoring system work? What factors does it consider?' },
  { text: 'Start assessment tips', query: 'What information should I gather before starting a patient assessment?' },
]

const VITALS_SUGGESTIONS: QuickSuggestion[] = [
  { text: 'Normal vital ranges?', query: 'What are the normal ranges for adult vital signs (BP, HR, SpO2, temp, RR)?' },
  { text: 'Critical SpO2 levels?', query: 'At what SpO2 level should I be concerned? What might cause low oxygen saturation?' },
  { text: 'BP interpretation', query: 'How do I interpret blood pressure readings? What values are concerning?' },
]

const SYMPTOMS_SUGGESTIONS: QuickSuggestion[] = [
  { text: 'Emergency symptoms?', query: 'What symptom combinations indicate a medical emergency requiring immediate attention?' },
  { text: 'Severity scoring', query: 'How is symptom severity scored and what makes some symptoms more urgent?' },
  { text: 'Chest pain assessment', query: 'How should I assess chest pain? What questions should I ask?' },
]

const PATIENT_DETAIL_SUGGESTIONS: QuickSuggestion[] = [
  { text: 'Summarize patient', query: 'Provide a brief clinical summary of this patient and their current status.' },
  { text: 'What to monitor?', query: 'Based on this patient\'s presentation, what should I monitor closely?' },
  { text: 'Treatment considerations', query: 'What treatment considerations should be kept in mind for this patient?' },
]

const XRAY_SUGGESTIONS: QuickSuggestion[] = [
  { text: 'Explain findings', query: 'Can you explain the X-ray findings in more detail?' },
  { text: 'What does this mean?', query: 'What do these X-ray findings mean for the patient clinically?' },
  { text: 'Additional views needed?', query: 'Based on the findings, are additional X-ray views or imaging studies needed?' },
]

const QUEUE_SUGGESTIONS: QuickSuggestion[] = [
  { text: 'Priority explanation', query: 'How should I prioritize patients in the queue? What determines who gets seen first?' },
  { text: 'Reassessment timing', query: 'How often should I reassess waiting patients? When should I re-triage?' },
]

const DEFAULT_SUGGESTIONS: QuickSuggestion[] = [
  { text: 'Help with triage', query: 'How can you help me with medical triage?' },
  { text: 'Ask a question', query: '' },
]

export function getQuickSuggestions(
  page: ChatPage,
  step?: AssessmentStep,
  hasPatient?: boolean
): QuickSuggestion[] {
  // X-ray step has specific suggestions
  if (page === 'assessment' && step === 'xray') {
    return XRAY_SUGGESTIONS
  }

  // Assessment step-specific suggestions
  if (page === 'assessment') {
    if (step === 'vitals') return VITALS_SUGGESTIONS
    if (step === 'symptoms') return SYMPTOMS_SUGGESTIONS
    return DEFAULT_SUGGESTIONS
  }

  // Patient detail with patient loaded
  if (page === 'patient-detail' && hasPatient) {
    return PATIENT_DETAIL_SUGGESTIONS
  }

  // Queue page
  if (page === 'queue') {
    return QUEUE_SUGGESTIONS
  }

  // Home page
  if (page === 'home') {
    return HOME_SUGGESTIONS
  }

  return DEFAULT_SUGGESTIONS
}
