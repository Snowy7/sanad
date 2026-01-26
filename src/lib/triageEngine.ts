import {
  Vitals,
  Symptom,
  XrayAnalysis,
  TriageScore,
  TriageFactor,
  TriagePriority,
} from '../types'

interface TriageInput {
  vitals: Vitals
  symptoms: Symptom[]
  xrayAnalysis: XrayAnalysis | null
}

// Weight configuration for different factors
const WEIGHTS = {
  vitals: {
    bloodPressure: 15,
    heartRate: 12,
    respiratoryRate: 15,
    oxygenSaturation: 20,
    temperature: 8,
  },
  symptoms: {
    base: 0.5, // Per symptom severity point
    critical: 10, // Additional for severity >= 9
    high: 5, // Additional for severity >= 7
  },
  xray: {
    critical: 25,
    high: 15,
    moderate: 8,
    low: 2,
  },
}

export function calculateTriageScore(input: TriageInput): TriageScore {
  const factors: TriageFactor[] = []
  let totalScore = 0

  // 1. Evaluate Vitals
  const vitalFactors = evaluateVitals(input.vitals)
  factors.push(...vitalFactors)
  totalScore += vitalFactors.reduce((sum, f) => sum + f.contribution, 0)

  // 2. Evaluate Symptoms
  const symptomFactors = evaluateSymptoms(input.symptoms)
  factors.push(...symptomFactors)
  totalScore += symptomFactors.reduce((sum, f) => sum + f.contribution, 0)

  // 3. Evaluate X-Ray findings
  if (input.xrayAnalysis) {
    const xrayFactor = evaluateXray(input.xrayAnalysis)
    factors.push(xrayFactor)
    totalScore += xrayFactor.contribution
  }

  // Normalize score to 0-100
  const normalizedScore = Math.min(100, Math.max(0, totalScore))

  // Determine priority
  const priority = scoreToPriority(normalizedScore)

  // Generate recommendation
  const recommendation = generateRecommendation(priority, factors)

  return {
    priority,
    score: Math.round(normalizedScore),
    factors: factors.sort((a, b) => b.contribution - a.contribution),
    recommendation,
  }
}

function evaluateVitals(vitals: Vitals): TriageFactor[] {
  const factors: TriageFactor[] = []

  // Blood Pressure
  if (vitals.bloodPressureSystolic !== null) {
    const bp = vitals.bloodPressureSystolic
    let contribution = 0
    let description = ''

    if (bp < 90 || bp > 180) {
      contribution = WEIGHTS.vitals.bloodPressure
      description = bp < 90 ? 'Severe hypotension' : 'Severe hypertension'
    } else if (bp < 100 || bp > 160) {
      contribution = WEIGHTS.vitals.bloodPressure * 0.6
      description = bp < 100 ? 'Low blood pressure' : 'High blood pressure'
    } else if (bp < 110 || bp > 140) {
      contribution = WEIGHTS.vitals.bloodPressure * 0.2
      description = 'Borderline blood pressure'
    }

    if (contribution > 0) {
      factors.push({
        name: 'Blood Pressure',
        weight: WEIGHTS.vitals.bloodPressure,
        contribution,
        description,
      })
    }
  }

  // Heart Rate
  if (vitals.heartRate !== null) {
    const hr = vitals.heartRate
    let contribution = 0
    let description = ''

    if (hr < 40 || hr > 150) {
      contribution = WEIGHTS.vitals.heartRate
      description = hr < 40 ? 'Severe bradycardia' : 'Severe tachycardia'
    } else if (hr < 50 || hr > 120) {
      contribution = WEIGHTS.vitals.heartRate * 0.6
      description = hr < 50 ? 'Bradycardia' : 'Tachycardia'
    } else if (hr < 60 || hr > 100) {
      contribution = WEIGHTS.vitals.heartRate * 0.2
      description = 'Abnormal heart rate'
    }

    if (contribution > 0) {
      factors.push({
        name: 'Heart Rate',
        weight: WEIGHTS.vitals.heartRate,
        contribution,
        description,
      })
    }
  }

  // Respiratory Rate
  if (vitals.respiratoryRate !== null) {
    const rr = vitals.respiratoryRate
    let contribution = 0
    let description = ''

    if (rr < 8 || rr > 30) {
      contribution = WEIGHTS.vitals.respiratoryRate
      description = rr < 8 ? 'Respiratory depression' : 'Severe tachypnea'
    } else if (rr < 10 || rr > 24) {
      contribution = WEIGHTS.vitals.respiratoryRate * 0.6
      description = rr < 10 ? 'Slow breathing' : 'Rapid breathing'
    } else if (rr < 12 || rr > 20) {
      contribution = WEIGHTS.vitals.respiratoryRate * 0.2
      description = 'Borderline respiratory rate'
    }

    if (contribution > 0) {
      factors.push({
        name: 'Respiratory Rate',
        weight: WEIGHTS.vitals.respiratoryRate,
        contribution,
        description,
      })
    }
  }

  // Oxygen Saturation - Critical vital sign
  if (vitals.oxygenSaturation !== null) {
    const spo2 = vitals.oxygenSaturation
    let contribution = 0
    let description = ''

    if (spo2 < 90) {
      contribution = WEIGHTS.vitals.oxygenSaturation
      description = 'Severe hypoxia - immediate intervention needed'
    } else if (spo2 < 94) {
      contribution = WEIGHTS.vitals.oxygenSaturation * 0.7
      description = 'Significant hypoxia - oxygen required'
    } else if (spo2 < 96) {
      contribution = WEIGHTS.vitals.oxygenSaturation * 0.3
      description = 'Borderline oxygen saturation'
    }

    if (contribution > 0) {
      factors.push({
        name: 'Oxygen Saturation',
        weight: WEIGHTS.vitals.oxygenSaturation,
        contribution,
        description,
      })
    }
  }

  // Temperature
  if (vitals.temperature !== null) {
    const temp = vitals.temperature
    let contribution = 0
    let description = ''

    if (temp < 35 || temp > 40) {
      contribution = WEIGHTS.vitals.temperature
      description = temp < 35 ? 'Hypothermia' : 'Severe hyperthermia'
    } else if (temp < 36 || temp > 39) {
      contribution = WEIGHTS.vitals.temperature * 0.5
      description = temp < 36 ? 'Low temperature' : 'High fever'
    } else if (temp > 38) {
      contribution = WEIGHTS.vitals.temperature * 0.2
      description = 'Fever'
    }

    if (contribution > 0) {
      factors.push({
        name: 'Temperature',
        weight: WEIGHTS.vitals.temperature,
        contribution,
        description,
      })
    }
  }

  return factors
}

function evaluateSymptoms(symptoms: Symptom[]): TriageFactor[] {
  const factors: TriageFactor[] = []
  const selectedSymptoms = symptoms.filter((s) => s.selected)

  selectedSymptoms.forEach((symptom) => {
    let contribution = symptom.severity * WEIGHTS.symptoms.base

    if (symptom.severity >= 9) {
      contribution += WEIGHTS.symptoms.critical
    } else if (symptom.severity >= 7) {
      contribution += WEIGHTS.symptoms.high
    }

    factors.push({
      name: symptom.name,
      weight: symptom.severity,
      contribution,
      description: `Severity ${symptom.severity}/10`,
    })
  })

  return factors
}

function evaluateXray(xrayAnalysis: XrayAnalysis): TriageFactor {
  let contribution = 0
  let description = ''

  // Check if there are any medic overrides
  const hasOverrides = xrayAnalysis.findings.some(f => f.override)

  switch (xrayAnalysis.overallRisk) {
    case 'critical':
      contribution = WEIGHTS.xray.critical
      description = 'Critical findings requiring immediate attention'
      break
    case 'high':
      contribution = WEIGHTS.xray.high
      description = 'Significant abnormalities detected'
      break
    case 'moderate':
      contribution = WEIGHTS.xray.moderate
      description = 'Some abnormalities detected'
      break
    case 'low':
      contribution = WEIGHTS.xray.low
      description = 'Minor or no abnormalities'
      break
  }

  // Add extra weight for specific critical findings, considering medic overrides
  const criticalFindings = xrayAnalysis.findings.filter((f) => {
    // Get effective confidence considering overrides
    const effectiveConfidence = f.override === 'disagree' ? 0 :
      f.override === 'adjust' && f.adjustedConfidence !== undefined ? f.adjustedConfidence :
      f.confidence

    return effectiveConfidence > 0.5 &&
      ['Pneumothorax', 'Pneumonia', 'Edema', 'Consolidation'].includes(f.pathology)
  })

  if (criticalFindings.length > 0) {
    const extraWeight = criticalFindings.reduce((sum, f) => {
      const effectiveConfidence = f.override === 'adjust' && f.adjustedConfidence !== undefined
        ? f.adjustedConfidence
        : f.confidence
      return sum + effectiveConfidence * 10
    }, 0)
    contribution += extraWeight
    description += ` (${criticalFindings.map((f) => f.pathology).join(', ')})`
  }

  // Add note if medic has reviewed findings
  if (hasOverrides) {
    description += ' [Medic reviewed]'
  }

  return {
    name: 'X-Ray Analysis',
    weight: 25,
    contribution,
    description,
  }
}

function scoreToPriority(score: number): TriagePriority {
  if (score >= 70) return 'immediate'
  if (score >= 45) return 'urgent'
  if (score >= 20) return 'delayed'
  return 'minimal'
}

function generateRecommendation(
  priority: TriagePriority,
  factors: TriageFactor[]
): string {
  const topFactors = factors
    .filter((f) => f.contribution > 0)
    .slice(0, 3)
    .map((f) => f.name.toLowerCase())

  switch (priority) {
    case 'immediate':
      return `Requires immediate medical attention. Priority concerns: ${
        topFactors.length > 0 ? topFactors.join(', ') : 'multiple critical factors'
      }.`
    case 'urgent':
      return `Needs urgent evaluation within 30 minutes. Key findings: ${
        topFactors.length > 0 ? topFactors.join(', ') : 'multiple concerning factors'
      }.`
    case 'delayed':
      return `Can wait for treatment but requires monitoring. Areas of concern: ${
        topFactors.length > 0 ? topFactors.join(', ') : 'mild symptoms'
      }.`
    case 'minimal':
      return 'Minor injuries or illness. Standard care protocols apply. Low priority for resource allocation.'
  }
}

// Function to override triage priority
export function overrideTriagePriority(
  currentScore: TriageScore,
  newPriority: TriagePriority,
  overriddenBy: string
): TriageScore {
  return {
    ...currentScore,
    priority: newPriority,
    overriddenBy,
    overriddenAt: new Date(),
    originalPriority: currentScore.originalPriority || currentScore.priority,
  }
}
