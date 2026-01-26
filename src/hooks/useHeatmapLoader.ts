import { useState, useEffect } from 'react'
import { getHeatmapsForAssessment, getHeatmap } from '../store/patientStore'
import { PersistedHeatmap } from '../types'

export interface LoadedHeatmap {
  pathology: string
  probability: number
  dataUrl: string
}

export function useHeatmapLoader(assessmentId: string | undefined, persistedHeatmaps?: PersistedHeatmap[]) {
  const [heatmaps, setHeatmaps] = useState<LoadedHeatmap[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedHeatmap, setSelectedHeatmap] = useState<string | null>(null)

  useEffect(() => {
    if (!assessmentId) {
      setHeatmaps([])
      return
    }

    const loadHeatmaps = async () => {
      setIsLoading(true)
      try {
        let loaded: LoadedHeatmap[] = []

        // If persisted heatmaps are provided with IDs, load from those
        if (persistedHeatmaps && persistedHeatmaps.length > 0) {
          for (const ph of persistedHeatmaps) {
            const blob = await getHeatmap(ph.heatmapImageId)
            if (blob) {
              const dataUrl = URL.createObjectURL(blob)
              loaded.push({
                pathology: ph.pathology,
                probability: ph.probability,
                dataUrl,
              })
            }
          }
        } else {
          // Fallback: try to load all heatmaps for this assessment
          const heatmapRecords = await getHeatmapsForAssessment(assessmentId)
          loaded = heatmapRecords.map(h => ({
            pathology: h.pathology,
            probability: h.probability,
            dataUrl: URL.createObjectURL(h.blob),
          }))
        }

        // Sort by probability (highest first)
        loaded.sort((a, b) => b.probability - a.probability)
        setHeatmaps(loaded)
      } catch (error) {
        console.error('Failed to load heatmaps:', error)
        setHeatmaps([])
      } finally {
        setIsLoading(false)
      }
    }

    loadHeatmaps()

    // Cleanup: revoke object URLs on unmount
    return () => {
      heatmaps.forEach(h => URL.revokeObjectURL(h.dataUrl))
    }
  }, [assessmentId, persistedHeatmaps])

  return {
    heatmaps,
    isLoading,
    selectedHeatmap,
    setSelectedHeatmap,
  }
}
