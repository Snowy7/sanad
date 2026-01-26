// PocketBase API client for SANAD

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090'

interface PocketBaseRecord {
  id: string
  collectionId: string
  collectionName: string
  created: string
  updated: string
}

interface PocketBaseListResponse<T> {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: T[]
}

// Assessment record as stored in PocketBase
export interface AssessmentRecord extends PocketBaseRecord {
  localId: string
  patientName: string
  patientAge: number
  patientGender: string
  chiefComplaint: string
  vitals: string // JSON string
  symptoms: string // JSON string
  xrayFindings: string | null // JSON string
  xrayImageId: string | null
  voiceNotes: string // JSON string
  additionalNotes: string
  triageScore: string | null // JSON string
  triagePriority: string
  localCreatedAt: string
  localUpdatedAt: string
  localVersion: number
}

class ApiClient {
  private baseUrl: string
  private authToken: string | null = null

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api${path}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        errorData.message || `HTTP ${response.status}`,
        errorData
      )
    }

    return response.json()
  }

  // Health check
  async health(): Promise<{ code: number; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/health`)
    return response.json()
  }

  // Assessments CRUD
  async listAssessments(
    page: number = 1,
    perPage: number = 50
  ): Promise<PocketBaseListResponse<AssessmentRecord>> {
    return this.request(`/collections/assessments/records?page=${page}&perPage=${perPage}&sort=-localUpdatedAt`)
  }

  async getAssessment(id: string): Promise<AssessmentRecord> {
    return this.request(`/collections/assessments/records/${id}`)
  }

  async getAssessmentByLocalId(localId: string): Promise<AssessmentRecord | null> {
    const response = await this.request<PocketBaseListResponse<AssessmentRecord>>(
      `/collections/assessments/records?filter=(localId='${localId}')`
    )
    return response.items[0] || null
  }

  async createAssessment(data: Omit<AssessmentRecord, keyof PocketBaseRecord>): Promise<AssessmentRecord> {
    return this.request('/collections/assessments/records', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAssessment(id: string, data: Partial<AssessmentRecord>): Promise<AssessmentRecord> {
    return this.request(`/collections/assessments/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAssessment(id: string): Promise<void> {
    await this.request(`/collections/assessments/records/${id}`, {
      method: 'DELETE',
    })
  }

  // File uploads
  async uploadFile(
    collectionName: string,
    recordId: string,
    fieldName: string,
    file: Blob,
    filename: string
  ): Promise<AssessmentRecord> {
    const formData = new FormData()
    formData.append(fieldName, file, filename)

    const url = `${this.baseUrl}/api/collections/${collectionName}/records/${recordId}`

    const headers: HeadersInit = {}
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        errorData.message || `HTTP ${response.status}`,
        errorData
      )
    }

    return response.json()
  }

  getFileUrl(collectionName: string, recordId: string, filename: string): string {
    return `${this.baseUrl}/api/files/${collectionName}/${recordId}/${filename}`
  }

  // Batch operations
  async getAssessmentsModifiedSince(timestamp: Date): Promise<AssessmentRecord[]> {
    const isoTime = timestamp.toISOString()
    const response = await this.request<PocketBaseListResponse<AssessmentRecord>>(
      `/collections/assessments/records?filter=(updated>'${isoTime}')&sort=updated&perPage=100`
    )
    return response.items
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Export singleton instance
export const api = new ApiClient()

// Export class for custom instances
export { ApiClient }
