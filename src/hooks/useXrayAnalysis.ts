import { useState, useCallback, useRef, useEffect } from 'react'
import * as ort from 'onnxruntime-web'
import { XrayInferenceResult, VLMAnalysisResult, XrayAnalysisSource } from '../types'
import { useSettingsStore, XrayModelType } from '../store/settingsStore'
import { lmStudioService } from '../services/lmStudioService'

// Configure ONNX Runtime Web
// Use local WASM files for offline support
ort.env.wasm.wasmPaths = '/wasm/'
ort.env.wasm.numThreads = 1

// Pathology labels from TorchXRayVision DenseNet
const PATHOLOGY_LABELS = [
  'Atelectasis',
  'Consolidation',
  'Infiltration',
  'Pneumothorax',
  'Edema',
  'Emphysema',
  'Fibrosis',
  'Effusion',
  'Pneumonia',
  'Pleural_Thickening',
  'Cardiomegaly',
  'Nodule',
  'Mass',
  'Hernia',
  'Lung Lesion',
  'Fracture',
  'Lung Opacity',
  'Enlarged Cardiomediastinum',
]

export interface PathologyHeatmap {
  name: string
  probability: number
  heatmapDataUrl: string
}

interface UseXrayAnalysisReturn {
  analyze: (file: File) => Promise<XrayInferenceResult | null>
  isLoading: boolean
  error: string | null
  isModelLoading: boolean
  modelLoadingProgress: number
  isDemoMode: boolean
  heatmaps: PathologyHeatmap[]
  selectedHeatmap: string | null
  setSelectedHeatmap: (name: string | null) => void
  // LM Studio specific
  currentModel: XrayModelType
  isLMStudioAvailable: boolean
  lmStudioConnectionStatus: 'unknown' | 'checking' | 'connected' | 'disconnected' | 'error'
  vlmAnalysis: VLMAnalysisResult | null
  vlmRawResponse: string | null
  checkLMStudioConnection: () => Promise<boolean>
  imageBase64: string | null
}

export function useXrayAnalysis(): UseXrayAnalysisReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0)
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [heatmaps, setHeatmaps] = useState<PathologyHeatmap[]>([])
  const [selectedHeatmap, setSelectedHeatmap] = useState<string | null>(null)
  const [vlmAnalysis, setVlmAnalysis] = useState<VLMAnalysisResult | null>(null)
  const [vlmRawResponse, setVlmRawResponse] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)

  const sessionRef = useRef<ort.InferenceSession | null>(null)
  const classifierWeightsRef = useRef<Float32Array | null>(null)
  const hasCAMRef = useRef(false)

  // Get settings from store
  const {
    xrayModel,
    lmStudioConfig,
    lmStudioConnectionStatus,
    setLMStudioConnectionStatus,
  } = useSettingsStore()

  // Update LM Studio service config when settings change
  useEffect(() => {
    lmStudioService.setConfig(lmStudioConfig)
  }, [lmStudioConfig])

  useEffect(() => {
    loadModel()
  }, [])

  const loadModel = async () => {
    if (sessionRef.current) return

    setIsModelLoading(true)
    setModelLoadingProgress(0)
    setError(null)

    try {
      // Try to load CAM model first (includes feature maps for heatmaps)
      let modelPath = '/models/chest_xray_cam.onnx'
      let hasCAM = false

      let checkResponse = await fetch(modelPath, { method: 'HEAD' })
      if (checkResponse.ok) {
        hasCAM = true
        console.log('CAM model found, will generate heatmaps')
      } else {
        // Fall back to base model
        modelPath = '/models/chest_xray.onnx'
        checkResponse = await fetch(modelPath, { method: 'HEAD' })
        if (!checkResponse.ok) {
          console.log('X-ray ONNX model not found')
          setIsDemoMode(true)
          setModelLoadingProgress(100)
          return
        }
      }

      console.log('Loading X-ray ONNX model from:', modelPath)
      setModelLoadingProgress(20)

      const session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'basic',
      })

      sessionRef.current = session
      hasCAMRef.current = hasCAM
      setIsDemoMode(false)
      setModelLoadingProgress(70)

      console.log('X-ray ONNX model loaded successfully!')
      console.log('Model input names:', session.inputNames)
      console.log('Model output names:', session.outputNames)

      // Load classifier weights for CAM if using CAM model
      if (hasCAM) {
        try {
          const weightsResponse = await fetch('/models/classifier_weights.bin')
          if (weightsResponse.ok) {
            const weightsBuffer = await weightsResponse.arrayBuffer()
            classifierWeightsRef.current = new Float32Array(weightsBuffer)
            console.log('Classifier weights loaded:', classifierWeightsRef.current.length, 'values')
          }
        } catch (e) {
          console.warn('Could not load classifier weights for CAM:', e)
        }
      }

      setModelLoadingProgress(100)

    } catch (e) {
      console.error('Failed to load X-ray model:', e)
      setError('Failed to load X-ray model. Using demo mode.')
      setIsDemoMode(true)
      setModelLoadingProgress(100)
    } finally {
      setIsModelLoading(false)
    }
  }

  // Check LM Studio connection
  const checkLMStudioConnection = useCallback(async (): Promise<boolean> => {
    setLMStudioConnectionStatus('checking')

    try {
      const result = await lmStudioService.checkConnection()

      if (result.connected) {
        setLMStudioConnectionStatus('connected')
        return true
      } else {
        setLMStudioConnectionStatus('disconnected', result.error)
        return false
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Connection check failed'
      setLMStudioConnectionStatus('error', message)
      return false
    }
  }, [setLMStudioConnectionStatus])

  // Convert file to base64 for VLM
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const preprocessImage = async (file: File): Promise<{ tensor: Float32Array; imageData: ImageData; image: HTMLImageElement }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Step 1: Center crop to square (like XRayCenterCrop)
        const size = Math.min(img.width, img.height)
        const offsetX = (img.width - size) / 2
        const offsetY = (img.height - size) / 2

        // Step 2: Resize to 224x224 (like XRayResizer)
        canvas.width = 224
        canvas.height = 224
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 224, 224)

        const imageData = ctx.getImageData(0, 0, 224, 224)
        const data = imageData.data

        // Step 3: Convert to grayscale and normalize to [-1, 1]
        // The ONNX model has internal scaling (x * 1024) to convert to TorchXRayVision range
        // Browser just needs to send [-1, 1] normalized grayscale
        const floatData = new Float32Array(224 * 224)
        for (let i = 0; i < 224 * 224; i++) {
          const r = data[i * 4]
          const g = data[i * 4 + 1]
          const b = data[i * 4 + 2]
          // Convert to grayscale (mean of channels)
          const gray = (r + g + b) / 3
          // Normalize to [-1, 1]: (gray / 127.5) - 1
          floatData[i] = (gray / 127.5) - 1.0
        }

        console.log('Preprocessed tensor stats:', {
          min: Math.min(...floatData),
          max: Math.max(...floatData),
          mean: floatData.reduce((a, b) => a + b, 0) / floatData.length
        })

        resolve({ tensor: floatData, imageData, image: img })
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  // Generate CAM heatmap for a specific pathology
  const generateCAMHeatmap = (
    featureMaps: Float32Array,
    classifierWeights: Float32Array,
    pathologyIndex: number,
    originalImage: HTMLImageElement
  ): string => {
    // Feature maps shape: [1, 1024, 7, 7]
    // Classifier weights shape: [18, 1024]
    const numChannels = 1024
    const featureSize = 7

    // Get weights for this pathology
    const weightsStart = pathologyIndex * numChannels
    const weights = classifierWeights.slice(weightsStart, weightsStart + numChannels)

    // Compute CAM: weighted sum of feature maps
    const cam = new Float32Array(featureSize * featureSize)
    for (let c = 0; c < numChannels; c++) {
      const weight = weights[c]
      for (let h = 0; h < featureSize; h++) {
        for (let w = 0; w < featureSize; w++) {
          const featureIdx = c * featureSize * featureSize + h * featureSize + w
          cam[h * featureSize + w] += weight * featureMaps[featureIdx]
        }
      }
    }

    // Apply ReLU and normalize
    let minVal = Infinity, maxVal = -Infinity
    for (let i = 0; i < cam.length; i++) {
      cam[i] = Math.max(0, cam[i]) // ReLU
      minVal = Math.min(minVal, cam[i])
      maxVal = Math.max(maxVal, cam[i])
    }

    const range = maxVal - minVal || 1
    for (let i = 0; i < cam.length; i++) {
      cam[i] = (cam[i] - minVal) / range
    }

    // Create heatmap overlay on original image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 224
    canvas.height = 224

    // Draw original image
    const size = Math.min(originalImage.width, originalImage.height)
    const offsetX = (originalImage.width - size) / 2
    const offsetY = (originalImage.height - size) / 2
    ctx.drawImage(originalImage, offsetX, offsetY, size, size, 0, 0, 224, 224)

    // Create heatmap overlay
    const imageData = ctx.getImageData(0, 0, 224, 224)
    const data = imageData.data

    // Upsample CAM from 7x7 to 224x224 and overlay
    const scale = 224 / featureSize
    for (let y = 0; y < 224; y++) {
      for (let x = 0; x < 224; x++) {
        // Bilinear interpolation
        const srcX = x / scale
        const srcY = y / scale
        const x0 = Math.floor(srcX)
        const y0 = Math.floor(srcY)
        const x1 = Math.min(x0 + 1, featureSize - 1)
        const y1 = Math.min(y0 + 1, featureSize - 1)
        const xFrac = srcX - x0
        const yFrac = srcY - y0

        const val =
          cam[y0 * featureSize + x0] * (1 - xFrac) * (1 - yFrac) +
          cam[y0 * featureSize + x1] * xFrac * (1 - yFrac) +
          cam[y1 * featureSize + x0] * (1 - xFrac) * yFrac +
          cam[y1 * featureSize + x1] * xFrac * yFrac

        // Apply colormap (jet-like: blue -> cyan -> green -> yellow -> red)
        const idx = (y * 224 + x) * 4
        const alpha = 0.5 // Heatmap opacity

        let r, g, b
        if (val < 0.25) {
          // Blue to cyan
          r = 0
          g = val * 4 * 255
          b = 255
        } else if (val < 0.5) {
          // Cyan to green
          r = 0
          g = 255
          b = (1 - (val - 0.25) * 4) * 255
        } else if (val < 0.75) {
          // Green to yellow
          r = (val - 0.5) * 4 * 255
          g = 255
          b = 0
        } else {
          // Yellow to red
          r = 255
          g = (1 - (val - 0.75) * 4) * 255
          b = 0
        }

        // Blend with original image
        data[idx] = Math.round(data[idx] * (1 - alpha) + r * alpha)
        data[idx + 1] = Math.round(data[idx + 1] * (1 - alpha) + g * alpha)
        data[idx + 2] = Math.round(data[idx + 2] * (1 - alpha) + b * alpha)
      }
    }

    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL('image/png')
  }

  // Run ONNX analysis
  const analyzeWithONNX = async (file: File): Promise<XrayInferenceResult | null> => {
    const startTime = performance.now()
    const { tensor, imageData, image } = await preprocessImage(file)

    let probabilities: number[]
    let featureMaps: Float32Array | null = null

    if (sessionRef.current && !isDemoMode) {
      console.log('Running inference with real model...')
      console.log('Creating input tensor with shape [1, 1, 224, 224]')

      const inputTensor = new ort.Tensor('float32', tensor, [1, 1, 224, 224])
      console.log('Input tensor created:', inputTensor.dims, inputTensor.type)

      const inputName = sessionRef.current.inputNames[0]
      const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor }
      console.log('Running model with input:', inputName)

      let results
      try {
        results = await sessionRef.current.run(feeds)
        console.log('Model inference completed')
        console.log('Output names:', sessionRef.current.outputNames)
      } catch (inferenceError) {
        console.error('Inference failed:', inferenceError)
        throw inferenceError
      }

      // Get probabilities output
      const probsOutputName = sessionRef.current.outputNames[0]
      const output = results[probsOutputName]
      const rawOutput = Array.from(output.data as Float32Array)

      console.log('Raw model output:', rawOutput.slice(0, 5), '...')

      // Model outputs probabilities [0, 1] directly, just clamp for safety
      probabilities = rawOutput.map(p => Math.max(0, Math.min(1, p)))
      console.log('Probabilities:', probabilities.map(p => (p * 100).toFixed(1) + '%').slice(0, 5), '...')

      // Get feature maps if CAM model
      if (hasCAMRef.current && sessionRef.current.outputNames.length > 1) {
        const featuresOutputName = sessionRef.current.outputNames[1]
        const featuresOutput = results[featuresOutputName]
        featureMaps = new Float32Array(featuresOutput.data as Float32Array)
        console.log('Feature maps shape:', featuresOutput.dims)
      }
    } else {
      console.log('Running in demo mode...')
      probabilities = analyzeImagePropertiesForDemo(imageData)
    }

    // Generate heatmaps for top pathologies
    if (featureMaps && classifierWeightsRef.current) {
      const significantPathologies = probabilities
        .map((prob, idx) => ({ prob, idx, name: PATHOLOGY_LABELS[idx] }))
        .filter(p => p.prob > 0.05) // Generate heatmaps for >5% probability
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 5) // Top 5 pathologies

      console.log('Generating heatmaps for:', significantPathologies.map(p => p.name))

      const generatedHeatmaps: PathologyHeatmap[] = significantPathologies.map(p => ({
        name: p.name,
        probability: p.prob,
        heatmapDataUrl: generateCAMHeatmap(featureMaps!, classifierWeightsRef.current!, p.idx, image)
      }))

      setHeatmaps(generatedHeatmaps)
    }

    const processingTime = performance.now() - startTime

    return {
      pathologies: PATHOLOGY_LABELS.map((name, i) => ({
        name,
        probability: probabilities[i] || 0,
      })),
      processingTime,
      source: 'onnx' as XrayAnalysisSource,
    }
  }

  // Run LM Studio VLM analysis
  const analyzeWithLMStudio = async (_file: File, base64Image: string): Promise<XrayInferenceResult | null> => {
    const startTime = performance.now()

    console.log('Running analysis with LM Studio VLM...')

    // Check connection if unknown
    if (lmStudioConnectionStatus === 'unknown') {
      const connected = await checkLMStudioConnection()
      if (!connected) {
        throw new Error('LM Studio server is not available')
      }
    } else if (lmStudioConnectionStatus !== 'connected') {
      throw new Error('LM Studio server is not connected')
    }

    const { result, rawResponse } = await lmStudioService.analyzeXray(base64Image)

    setVlmAnalysis(result)
    setVlmRawResponse(rawResponse)

    const processingTime = performance.now() - startTime

    // Create minimal pathology data (VLM doesn't provide individual probabilities)
    return {
      pathologies: PATHOLOGY_LABELS.map((name) => ({
        name,
        probability: 0, // VLM doesn't provide individual pathology probabilities
      })),
      processingTime,
      source: 'lmstudio' as XrayAnalysisSource,
      vlmResult: result,
    }
  }

  const analyze = useCallback(
    async (file: File): Promise<XrayInferenceResult | null> => {
      setIsLoading(true)
      setError(null)
      setHeatmaps([])
      setSelectedHeatmap(null)
      setVlmAnalysis(null)
      setVlmRawResponse(null)

      try {
        // Convert to base64 for VLM and store for chat
        const base64Image = await fileToBase64(file)
        setImageBase64(base64Image)

        // Determine which backend to use
        const useVLM = xrayModel === 'lmstudio' && lmStudioConnectionStatus === 'connected'

        if (useVLM) {
          try {
            return await analyzeWithLMStudio(file, base64Image)
          } catch (vlmError) {
            console.warn('VLM analysis failed, falling back to ONNX:', vlmError)
            setError(`LM Studio failed: ${vlmError instanceof Error ? vlmError.message : 'Unknown error'}. Using ONNX fallback.`)
            // Fallback to ONNX
            return await analyzeWithONNX(file)
          }
        } else {
          return await analyzeWithONNX(file)
        }
      } catch (e) {
        console.error('X-ray analysis error:', e)
        console.error('Error details:', {
          name: e instanceof Error ? e.name : 'Unknown',
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined
        })
        const message = e instanceof Error ? e.message : 'Analysis failed'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [isDemoMode, xrayModel, lmStudioConnectionStatus, checkLMStudioConnection]
  )

  // Demo mode analysis
  const analyzeImagePropertiesForDemo = (imageData: ImageData): number[] => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    let sum = 0
    let highIntensityCount = 0
    let darkCount = 0
    let edgeCount = 0
    const grayscale: number[] = []

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      grayscale.push(gray)
      sum += gray
      if (gray > 200) highIntensityCount++
      if (gray < 50) darkCount++
    }

    const pixelCount = grayscale.length
    const brightness = sum / pixelCount / 255

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const gx = Math.abs(grayscale[idx + 1] - grayscale[idx - 1])
        const gy = Math.abs(grayscale[idx + width] - grayscale[idx - width])
        if (gx + gy > 30) edgeCount++
      }
    }

    const hasHighIntensity = highIntensityCount / pixelCount > 0.1
    const hasDarkRegions = darkCount / pixelCount > 0.15
    const edgeDensity = edgeCount / pixelCount

    const probs = PATHOLOGY_LABELS.map(() => Math.random() * 0.12)

    if (hasHighIntensity) {
      probs[1] += 0.15 + Math.random() * 0.15
      probs[2] += 0.12 + Math.random() * 0.1
      probs[16] += 0.1 + Math.random() * 0.1
    }

    if (hasDarkRegions) {
      probs[3] += 0.08 + Math.random() * 0.08
      probs[5] += 0.1 + Math.random() * 0.1
    }

    if (edgeDensity > 0.08) {
      probs[6] += 0.08 + Math.random() * 0.08
      probs[11] += 0.06 + Math.random() * 0.06
    }

    if (brightness < 0.4) {
      probs[0] += 0.1
      probs[7] += 0.12
    } else if (brightness > 0.6) {
      probs[4] += 0.12
    }

    if (Math.random() > 0.75) {
      probs[10] += 0.15 + Math.random() * 0.15
    }

    return probs.map(p => Math.min(0.92, Math.max(0.02, p)))
  }

  const isLMStudioAvailable = lmStudioConnectionStatus === 'connected'

  return {
    analyze,
    isLoading,
    error,
    isModelLoading,
    modelLoadingProgress,
    isDemoMode,
    heatmaps,
    selectedHeatmap,
    setSelectedHeatmap,
    // LM Studio specific
    currentModel: xrayModel,
    isLMStudioAvailable,
    lmStudioConnectionStatus,
    vlmAnalysis,
    vlmRawResponse,
    checkLMStudioConnection,
    imageBase64,
  }
}
