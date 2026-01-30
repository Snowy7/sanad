export interface OnboardingStep {
  id: string
  target: string // data-onboarding attribute value
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  route?: string // Route to navigate to before showing this step
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    target: 'home-hero',
    title: 'Welcome to SANAD!',
    description: "Let's take a quick tour of the AI-powered medical triage system.",
    position: 'center',
    route: '/',
  },
  {
    id: 'new-assessment',
    target: 'new-assessment-btn',
    title: 'Start a New Assessment',
    description: 'This button starts a new patient assessment where you\'ll enter patient info, vitals, and symptoms.',
    position: 'bottom',
    route: '/',
  },
  {
    id: 'patient-queue',
    target: 'patient-queue-btn',
    title: 'Patient Queue',
    description: 'View all triaged patients sorted by priority. Critical patients appear at the top.',
    position: 'bottom',
    route: '/',
  },
  {
    id: 'imaging-queue-home',
    target: 'imaging-queue-btn',
    title: 'Imaging Queue',
    description: 'Manage imaging priorities and assign mobile X-ray/ultrasound units to patients who need them most.',
    position: 'bottom',
    route: '/',
  },
  {
    id: 'nav-bar',
    target: 'nav-imaging',
    title: 'Navigation',
    description: 'Use the bottom navigation to quickly switch between Home, Assessment, Queue, Imaging, and Settings.',
    position: 'top',
  },
  {
    id: 'settings',
    target: 'nav-settings',
    title: 'Settings & Help',
    description: 'Configure AI models and restart this tutorial anytime from Settings. That\'s the tour - you\'re ready to go!',
    position: 'top',
  },
]

export const TOTAL_STEPS = onboardingSteps.length
