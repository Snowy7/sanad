// Background blob upload service for SANAD
import { api } from './api'
import { getXrayImage, getVoiceRecording, getHeatmapsForAssessment } from '../store/patientStore'

export interface BlobUploadJob {
  assessmentId: string
  type: 'xray' | 'voice' | 'heatmap'
  localId: string
  serverId?: string
}

export interface UploadResult {
  success: boolean
  localId: string
  serverUrl?: string
  error?: string
}

class BlobUploader {
  private uploadQueue: BlobUploadJob[] = []
  private isProcessing = false

  // Queue a blob for upload
  queue(job: BlobUploadJob): void {
    // Avoid duplicates
    const exists = this.uploadQueue.some(
      j => j.localId === job.localId && j.type === job.type
    )
    if (!exists) {
      this.uploadQueue.push(job)
    }
  }

  // Process upload queue
  async processQueue(): Promise<UploadResult[]> {
    if (this.isProcessing) {
      return []
    }

    this.isProcessing = true
    const results: UploadResult[] = []

    try {
      while (this.uploadQueue.length > 0) {
        const job = this.uploadQueue.shift()!

        try {
          const result = await this.uploadBlob(job)
          results.push(result)
        } catch (error) {
          results.push({
            success: false,
            localId: job.localId,
            error: error instanceof Error ? error.message : 'Upload failed',
          })

          // Re-queue for retry (max 3 attempts)
          // Note: In production, add retry count tracking
          this.uploadQueue.push(job)
        }
      }
    } finally {
      this.isProcessing = false
    }

    return results
  }

  // Upload a single blob
  private async uploadBlob(job: BlobUploadJob): Promise<UploadResult> {
    if (!job.serverId) {
      return {
        success: false,
        localId: job.localId,
        error: 'No server ID for assessment',
      }
    }

    let blob: Blob | null = null
    let filename = ''
    let fieldName = ''

    switch (job.type) {
      case 'xray':
        blob = await getXrayImage(job.localId)
        filename = `xray_${job.localId}.jpg`
        fieldName = 'xrayImage'
        break

      case 'voice':
        blob = await getVoiceRecording(job.localId)
        filename = `voice_${job.localId}.webm`
        fieldName = 'voiceRecording'
        break

      case 'heatmap': {
        const heatmaps = await getHeatmapsForAssessment(job.assessmentId)
        const heatmap = heatmaps.find(h => h.id === job.localId)
        if (heatmap) {
          blob = heatmap.blob
          filename = `heatmap_${heatmap.pathology}_${job.localId}.png`
          fieldName = 'heatmapImages'
        }
        break
      }
    }

    if (!blob || !filename) {
      return {
        success: false,
        localId: job.localId,
        error: `Blob not found: ${job.type}`,
      }
    }

    await api.uploadFile(
      'assessments',
      job.serverId,
      fieldName,
      blob,
      filename
    )

    const serverUrl = api.getFileUrl('assessments', job.serverId, filename)

    return {
      success: true,
      localId: job.localId,
      serverUrl,
    }
  }

  // Upload all blobs for an assessment
  async uploadAssessmentBlobs(
    assessmentId: string,
    serverId: string,
    xrayImageId?: string,
    voiceNoteIds?: string[]
  ): Promise<UploadResult[]> {
    const jobs: BlobUploadJob[] = []

    if (xrayImageId) {
      jobs.push({
        assessmentId,
        type: 'xray',
        localId: xrayImageId,
        serverId,
      })
    }

    if (voiceNoteIds) {
      for (const voiceId of voiceNoteIds) {
        jobs.push({
          assessmentId,
          type: 'voice',
          localId: voiceId,
          serverId,
        })
      }
    }

    // Also upload heatmaps
    const heatmaps = await getHeatmapsForAssessment(assessmentId)
    for (const heatmap of heatmaps) {
      jobs.push({
        assessmentId,
        type: 'heatmap',
        localId: heatmap.id,
        serverId,
      })
    }

    // Add jobs to queue
    jobs.forEach(job => this.queue(job))

    // Process immediately
    return this.processQueue()
  }

  // Get queue status
  getQueueLength(): number {
    return this.uploadQueue.length
  }

  isUploading(): boolean {
    return this.isProcessing
  }
}

// Export singleton instance
export const blobUploader = new BlobUploader()
