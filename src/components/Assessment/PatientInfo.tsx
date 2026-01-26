import { User } from 'lucide-react'
import { Patient } from '../../types'

interface PatientInfoProps {
  patient: Partial<Patient>
  onChange: (patient: Partial<Patient>) => void
}

export default function PatientInfo({ patient, onChange }: PatientInfoProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary-100 p-3 rounded-xl">
          <User className="w-6 h-6 text-primary-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Patient Information</h2>
          <p className="text-sm text-gray-500">Enter basic patient details</p>
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <label htmlFor="name" className="label">
            Patient Name
          </label>
          <input
            id="name"
            type="text"
            className="input"
            placeholder="Enter patient name"
            value={patient.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className="label">
              Age
            </label>
            <input
              id="age"
              type="number"
              className="input"
              placeholder="Years"
              min={0}
              max={150}
              value={patient.age || ''}
              onChange={(e) => onChange({ age: parseInt(e.target.value) || undefined })}
            />
          </div>

          <div>
            <label htmlFor="gender" className="label">
              Gender
            </label>
            <select
              id="gender"
              className="input"
              value={patient.gender || ''}
              onChange={(e) => onChange({ gender: e.target.value as Patient['gender'] })}
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="chiefComplaint" className="label">
            Chief Complaint
          </label>
          <textarea
            id="chiefComplaint"
            className="input min-h-[100px] resize-none"
            placeholder="What brings the patient in today?"
            value={patient.chiefComplaint || ''}
            onChange={(e) => onChange({ chiefComplaint: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
