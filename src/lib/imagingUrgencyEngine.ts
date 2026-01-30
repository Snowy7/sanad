import {
  Vitals,
  Symptom,
  ImagingUrgency,
  ImagingUrgencyFactor,
  ImagingRequest,
  ImagingType,
  BodyRegion,
} from '../types'

interface ImagingUrgencyInput {
  vitals: Vitals
  symptoms: Symptom[]
}

interface ImagingUrgencyResult {
  urgency: ImagingUrgency
  urgencyScore: number
  urgencyFactors: ImagingUrgencyFactor[]
  recommendedImagingType: ImagingType
  recommendedBodyRegion: BodyRegion
  clinicalIndication: string
}

// Urgency score thresholds
const URGENCY_THRESHOLDS = {
  critical: 70,  // >= 70: Needs imaging NOW
  high: 45,      // 45-69: Prioritize imaging
  routine: 20,   // 20-44: Standard queue
  // < 20: Not-required
}

// Weight configuration for imaging urgency factors
const IMAGING_WEIGHTS = {
  vitals: {
    oxygenSaturation: {
      critical: 30,    // SpO2 < 90%
      high: 20,        // SpO2 90-94%
      moderate: 8,     // SpO2 94-96%
    },
    respiratoryRate: {
      critical: 20,    // RR < 8 or > 30
      high: 12,        // RR < 10 or > 24
      moderate: 5,     // RR < 12 or > 20
    },
    heartRate: {
      critical: 15,    // HR < 40 or > 150
      high: 10,        // HR < 50 or > 120
      moderate: 4,     // HR < 60 or > 100
    },
    bloodPressure: {
      critical: 12,    // BP < 90 or > 180
      high: 8,         // BP < 100 or > 160
      moderate: 3,     // BP borderline
    },
    temperature: {
      critical: 8,     // Temp < 35 or > 40
      high: 5,         // Temp < 36 or > 39
      moderate: 2,     // Temp > 38
    },
  },
  symptoms: {
    hemoptysis: 35,           // Coughing blood - CRITICAL for chest imaging
    dyspnea: 25,              // Difficulty breathing - HIGH for chest
    chestPain: 22,            // Chest pain - HIGH for chest
    syncope: 20,              // Fainting - HIGH for cardiac/chest
    alteredConsciousness: 18, // Altered consciousness - HIGH for head
    severeBleeding: 15,       // Severe bleeding - HIGH for affected region
    fracture: 18,             // Possible fracture - HIGH for extremity
    seizure: 12,              // Seizure - MODERATE for head
    cough: 8,                 // Cough (with fever) - ROUTINE for chest
    fever: 5,                 // High fever - contributes to chest indication
  },
}

// Symptom to imaging type/region mappings
const SYMPTOM_IMAGING_MAP: Record<string, { type: ImagingType; region: BodyRegion }> = {
  'hemoptysis': { type: 'xray', region: 'chest' },
  'dyspnea': { type: 'xray', region: 'chest' },
  'chest-pain': { type: 'xray', region: 'chest' },
  'syncope': { type: 'xray', region: 'chest' },
  'palpitations': { type: 'xray', region: 'chest' },
  'wheezing': { type: 'xray', region: 'chest' },
  'cough': { type: 'xray', region: 'chest' },
  'altered-consciousness': { type: 'both', region: 'head' },
  'seizure': { type: 'both', region: 'head' },
  'headache-severe': { type: 'both', region: 'head' },
  'fracture': { type: 'xray', region: 'extremity' },
  'burns': { type: 'xray', region: 'multiple' },
  'wound': { type: 'xray', region: 'extremity' },
  'bleeding-severe': { type: 'xray', region: 'multiple' },
  'vomiting': { type: 'ultrasound', region: 'abdomen' },
  'edema': { type: 'xray', region: 'chest' },
}

export function calculateImagingUrgency(input: ImagingUrgencyInput): ImagingUrgencyResult {
  const factors: ImagingUrgencyFactor[] = []
  let totalScore = 0
  const regionVotes: Record<BodyRegion, number> = {
    chest: 0,
    abdomen: 0,
    extremity: 0,
    head: 0,
    spine: 0,
    multiple: 0,
  }
  const typeVotes: Record<ImagingType, number> = {
    xray: 0,
    ultrasound: 0,
    both: 0,
  }
  const indications: string[] = []

  // 1. Evaluate Vitals for Imaging Urgency
  const vitalFactors = evaluateVitalsForImaging(input.vitals)
  factors.push(...vitalFactors)
  totalScore += vitalFactors.reduce((sum, f) => sum + f.contribution, 0)

  // Vitals abnormalities suggest chest imaging
  if (vitalFactors.length > 0) {
    regionVotes.chest += vitalFactors.reduce((sum, f) => sum + f.contribution, 0)
    typeVotes.xray += vitalFactors.length * 5
  }

  // 2. Evaluate Symptoms for Imaging Urgency
  const { symptomFactors, symptomIndications } = evaluateSymptomsForImaging(input.symptoms)
  factors.push(...symptomFactors)
  totalScore += symptomFactors.reduce((sum, f) => sum + f.contribution, 0)
  indications.push(...symptomIndications)

  // Add symptom votes for region/type
  const selectedSymptoms = input.symptoms.filter(s => s.selected)
  selectedSymptoms.forEach(symptom => {
    const mapping = SYMPTOM_IMAGING_MAP[symptom.id]
    if (mapping) {
      const weight = symptom.severity
      regionVotes[mapping.region] += weight
      typeVotes[mapping.type] += weight
    }
  })

  // Determine recommended imaging type and region
  const recommendedBodyRegion = Object.entries(regionVotes)
    .sort((a, b) => b[1] - a[1])[0][0] as BodyRegion
  const recommendedImagingType = Object.entries(typeVotes)
    .sort((a, b) => b[1] - a[1])[0][0] as ImagingType

  // Normalize score to 0-100
  const normalizedScore = Math.min(100, Math.max(0, totalScore))

  // Determine urgency level
  const urgency = scoreToUrgency(normalizedScore)

  // Generate clinical indication
  const clinicalIndication = generateClinicalIndication(urgency, indications, recommendedBodyRegion)

  return {
    urgency,
    urgencyScore: Math.round(normalizedScore),
    urgencyFactors: factors.sort((a, b) => b.contribution - a.contribution),
    recommendedImagingType: urgency === 'not-required' ? 'xray' : recommendedImagingType,
    recommendedBodyRegion: urgency === 'not-required' ? 'chest' : recommendedBodyRegion,
    clinicalIndication,
  }
}

function evaluateVitalsForImaging(vitals: Vitals): ImagingUrgencyFactor[] {
  const factors: ImagingUrgencyFactor[] = []

  // Oxygen Saturation - Primary imaging indicator
  if (vitals.oxygenSaturation !== null) {
    const spo2 = vitals.oxygenSaturation
    let contribution = 0
    let description = ''

    if (spo2 < 90) {
      contribution = IMAGING_WEIGHTS.vitals.oxygenSaturation.critical
      description = 'Severe hypoxia - immediate chest imaging indicated'
    } else if (spo2 < 94) {
      contribution = IMAGING_WEIGHTS.vitals.oxygenSaturation.high
      description = 'Hypoxia - chest imaging recommended'
    } else if (spo2 < 96) {
      contribution = IMAGING_WEIGHTS.vitals.oxygenSaturation.moderate
      description = 'Borderline oxygen - consider chest imaging'
    }

    if (contribution > 0) {
      factors.push({
        name: `SpO2 ${spo2}%`,
        category: 'vital',
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
      contribution = IMAGING_WEIGHTS.vitals.respiratoryRate.critical
      description = rr < 8 ? 'Respiratory depression - chest imaging critical' : 'Severe tachypnea - chest imaging critical'
    } else if (rr < 10 || rr > 24) {
      contribution = IMAGING_WEIGHTS.vitals.respiratoryRate.high
      description = rr < 10 ? 'Slow breathing - chest imaging recommended' : 'Rapid breathing - chest imaging recommended'
    } else if (rr < 12 || rr > 20) {
      contribution = IMAGING_WEIGHTS.vitals.respiratoryRate.moderate
      description = 'Abnormal respiratory rate'
    }

    if (contribution > 0) {
      factors.push({
        name: `RR ${rr}/min`,
        category: 'vital',
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
      contribution = IMAGING_WEIGHTS.vitals.heartRate.critical
      description = hr < 40 ? 'Severe bradycardia' : 'Severe tachycardia'
    } else if (hr < 50 || hr > 120) {
      contribution = IMAGING_WEIGHTS.vitals.heartRate.high
      description = hr < 50 ? 'Bradycardia' : 'Tachycardia'
    } else if (hr < 60 || hr > 100) {
      contribution = IMAGING_WEIGHTS.vitals.heartRate.moderate
      description = 'Abnormal heart rate'
    }

    if (contribution > 0) {
      factors.push({
        name: `HR ${hr} bpm`,
        category: 'vital',
        contribution,
        description,
      })
    }
  }

  // Blood Pressure
  if (vitals.bloodPressureSystolic !== null) {
    const bp = vitals.bloodPressureSystolic
    let contribution = 0
    let description = ''

    if (bp < 90 || bp > 180) {
      contribution = IMAGING_WEIGHTS.vitals.bloodPressure.critical
      description = bp < 90 ? 'Severe hypotension' : 'Severe hypertension'
    } else if (bp < 100 || bp > 160) {
      contribution = IMAGING_WEIGHTS.vitals.bloodPressure.high
      description = bp < 100 ? 'Low blood pressure' : 'High blood pressure'
    } else if (bp < 110 || bp > 140) {
      contribution = IMAGING_WEIGHTS.vitals.bloodPressure.moderate
      description = 'Borderline blood pressure'
    }

    if (contribution > 0) {
      factors.push({
        name: `BP ${bp} mmHg`,
        category: 'vital',
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
      contribution = IMAGING_WEIGHTS.vitals.temperature.critical
      description = temp < 35 ? 'Hypothermia' : 'Severe hyperthermia'
    } else if (temp < 36 || temp > 39) {
      contribution = IMAGING_WEIGHTS.vitals.temperature.high
      description = temp < 36 ? 'Low temperature' : 'High fever'
    } else if (temp > 38) {
      contribution = IMAGING_WEIGHTS.vitals.temperature.moderate
      description = 'Fever'
    }

    if (contribution > 0) {
      factors.push({
        name: `Temp ${temp}°C`,
        category: 'vital',
        contribution,
        description,
      })
    }
  }

  return factors
}

function evaluateSymptomsForImaging(symptoms: Symptom[]): {
  symptomFactors: ImagingUrgencyFactor[]
  symptomIndications: string[]
} {
  const factors: ImagingUrgencyFactor[] = []
  const indications: string[] = []
  const selectedSymptoms = symptoms.filter(s => s.selected)

  // Check for hemoptysis (coughing blood) - CRITICAL
  const hemoptysis = selectedSymptoms.find(s => s.id === 'hemoptysis')
  if (hemoptysis) {
    factors.push({
      name: 'Coughing Blood',
      category: 'symptom',
      contribution: IMAGING_WEIGHTS.symptoms.hemoptysis,
      description: 'Hemoptysis - immediate chest imaging critical',
    })
    indications.push('hemoptysis')
  }

  // Check for dyspnea (difficulty breathing)
  const dyspnea = selectedSymptoms.find(s => s.id === 'dyspnea')
  if (dyspnea) {
    factors.push({
      name: 'Difficulty Breathing',
      category: 'symptom',
      contribution: IMAGING_WEIGHTS.symptoms.dyspnea,
      description: 'Dyspnea - chest imaging indicated',
    })
    indications.push('respiratory distress')
  }

  // Check for chest pain
  const chestPain = selectedSymptoms.find(s => s.id === 'chest-pain')
  if (chestPain) {
    factors.push({
      name: 'Chest Pain',
      category: 'symptom',
      contribution: IMAGING_WEIGHTS.symptoms.chestPain,
      description: 'Chest pain - cardiac/pulmonary imaging indicated',
    })
    indications.push('chest pain')
  }

  // Chest pain + dyspnea combination increases urgency
  if (chestPain && dyspnea) {
    factors.push({
      name: 'Chest Pain + Dyspnea',
      category: 'symptom',
      contribution: 10, // Additional combo bonus
      description: 'Combined cardiac/pulmonary symptoms - urgent imaging',
    })
  }

  // Check for syncope (fainting)
  const syncope = selectedSymptoms.find(s => s.id === 'syncope')
  if (syncope) {
    factors.push({
      name: 'Syncope',
      category: 'symptom',
      contribution: IMAGING_WEIGHTS.symptoms.syncope,
      description: 'Fainting - cardiac evaluation needed',
    })
    indications.push('syncope')
  }

  // Syncope + cardiac symptoms combo
  if (syncope && (chestPain || selectedSymptoms.find(s => s.id === 'palpitations'))) {
    factors.push({
      name: 'Syncope + Cardiac',
      category: 'symptom',
      contribution: 8,
      description: 'Syncope with cardiac symptoms - urgent chest imaging',
    })
  }

  // Check for altered consciousness
  const alteredConsciousness = selectedSymptoms.find(s => s.id === 'altered-consciousness')
  if (alteredConsciousness) {
    factors.push({
      name: 'Altered Consciousness',
      category: 'symptom',
      contribution: IMAGING_WEIGHTS.symptoms.alteredConsciousness,
      description: 'Altered mental status - head imaging indicated',
    })
    indications.push('altered mental status')
  }

  // Check for severe bleeding
  const severeBleeding = selectedSymptoms.find(s => s.id === 'bleeding-severe')
  if (severeBleeding) {
    factors.push({
      name: 'Severe Bleeding',
      category: 'symptom',
      contribution: IMAGING_WEIGHTS.symptoms.severeBleeding,
      description: 'Severe bleeding - imaging to assess source',
    })
    indications.push('hemorrhage')
  }

  // Check for possible fracture
  const fracture = selectedSymptoms.find(s => s.id === 'fracture')
  if (fracture) {
    factors.push({
      name: 'Possible Fracture',
      category: 'symptom',
      contribution: IMAGING_WEIGHTS.symptoms.fracture,
      description: 'Suspected fracture - X-ray of affected area',
    })
    indications.push('suspected fracture')
  }

  // Check for seizure
  const seizure = selectedSymptoms.find(s => s.id === 'seizure')
  if (seizure) {
    factors.push({
      name: 'Seizure',
      category: 'symptom',
      contribution: IMAGING_WEIGHTS.symptoms.seizure,
      description: 'Seizure activity - head imaging may be indicated',
    })
    indications.push('seizure')
  }

  // Check for cough (with fever = routine chest X-ray indication)
  const cough = selectedSymptoms.find(s => s.id === 'cough')
  const fever = selectedSymptoms.find(s => s.id === 'fever-high')
  if (cough && fever) {
    factors.push({
      name: 'Cough + Fever',
      category: 'symptom',
      contribution: IMAGING_WEIGHTS.symptoms.cough + IMAGING_WEIGHTS.symptoms.fever,
      description: 'Persistent cough with fever - chest X-ray for pneumonia evaluation',
    })
    indications.push('fever with respiratory symptoms')
  } else if (cough) {
    factors.push({
      name: 'Cough',
      category: 'symptom',
      contribution: IMAGING_WEIGHTS.symptoms.cough / 2,
      description: 'Cough - consider chest X-ray',
    })
  }

  return { symptomFactors: factors, symptomIndications: indications }
}

function scoreToUrgency(score: number): ImagingUrgency {
  if (score >= URGENCY_THRESHOLDS.critical) return 'critical'
  if (score >= URGENCY_THRESHOLDS.high) return 'high'
  if (score >= URGENCY_THRESHOLDS.routine) return 'routine'
  return 'not-required'
}

function generateClinicalIndication(
  urgency: ImagingUrgency,
  indications: string[],
  bodyRegion: BodyRegion
): string {
  if (urgency === 'not-required') {
    return 'No immediate imaging indication based on current vitals and symptoms.'
  }

  const regionText = bodyRegion === 'multiple' ? 'multiple regions' : bodyRegion
  const indicationText = indications.length > 0
    ? indications.slice(0, 3).join(', ')
    : 'clinical assessment'

  switch (urgency) {
    case 'critical':
      return `URGENT: Immediate ${regionText} imaging required for ${indicationText}.`
    case 'high':
      return `Prioritize ${regionText} imaging for ${indicationText}.`
    case 'routine':
      return `Standard ${regionText} imaging indicated for ${indicationText}.`
    default:
      return `Consider ${regionText} imaging based on clinical presentation.`
  }
}

// Helper function to create an ImagingRequest from urgency result
export function createImagingRequest(
  result: ImagingUrgencyResult,
  overrides?: {
    urgency?: ImagingUrgency
    imagingType?: ImagingType
    bodyRegion?: BodyRegion
  }
): ImagingRequest {
  const finalUrgency = overrides?.urgency ?? result.urgency

  return {
    urgency: finalUrgency,
    urgencyScore: result.urgencyScore,
    urgencyFactors: result.urgencyFactors,
    status: finalUrgency === 'not-required' ? 'not-needed' : 'pending',
    requestedAt: new Date(),
    imagingType: overrides?.imagingType ?? result.recommendedImagingType,
    bodyRegion: overrides?.bodyRegion ?? result.recommendedBodyRegion,
    clinicalIndication: result.clinicalIndication,
  }
}
