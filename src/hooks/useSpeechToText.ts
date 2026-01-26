import { useState, useCallback, useRef, useEffect } from 'react'
import { pipeline, AutomaticSpeechRecognitionOutput } from '@huggingface/transformers'
import { WhisperTranscriptionResult } from '../types'

type ASRPipeline = Awaited<ReturnType<typeof pipeline<'automatic-speech-recognition'>>>

interface UseSpeechToTextReturn {
  isRecording: boolean
  isTranscribing: boolean
  transcript: string
  startRecording: () => Promise<void>
  stopRecording: () => Promise<WhisperTranscriptionResult | null>
  isModelLoading: boolean
  modelLoadingProgress: number
  error: string | null
}

export function useSpeechToText(): UseSpeechToTextReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const pipelineRef = useRef<ASRPipeline | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Load model on mount
  useEffect(() => {
    loadModel()

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const loadModel = async () => {
    if (pipelineRef.current) return

    setIsModelLoading(true)
    setModelLoadingProgress(0)

    try {
      // Use Whisper tiny for faster loading - multilingual version for Arabic support
      const asr = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny',
        {
          progress_callback: (progress: { status: string; progress?: number; file?: string }) => {
            if (progress.progress !== undefined) {
              setModelLoadingProgress(Math.round(progress.progress))
            }
          },
        }
      )
      pipelineRef.current = asr
      setModelLoadingProgress(100)
      console.log('Whisper model loaded successfully')
    } catch (e) {
      console.error('Failed to load Whisper model:', e)
      setError('Failed to load speech recognition model.')
    } finally {
      setIsModelLoading(false)
    }
  }

  // Convert audio blob to Float32Array for Whisper
  const convertBlobToAudioData = async (blob: Blob): Promise<Float32Array> => {
    const audioContext = new AudioContext({ sampleRate: 16000 })
    audioContextRef.current = audioContext

    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Get audio data from first channel
    const audioData = audioBuffer.getChannelData(0)

    // Resample to 16kHz if needed (Whisper expects 16kHz)
    if (audioBuffer.sampleRate !== 16000) {
      const ratio = audioBuffer.sampleRate / 16000
      const newLength = Math.round(audioData.length / ratio)
      const resampled = new Float32Array(newLength)

      for (let i = 0; i < newLength; i++) {
        const srcIndex = Math.floor(i * ratio)
        resampled[i] = audioData[srcIndex]
      }
      return resampled
    }

    return audioData
  }

  const startRecording = useCallback(async () => {
    setError(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      // Try to use a format that's widely supported
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg'
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Start recording with smaller chunks
      mediaRecorder.start(500)
      setIsRecording(true)
      setTranscript('')
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to access microphone'
      setError(message)
      throw e
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<WhisperTranscriptionResult | null> => {
    if (!mediaRecorderRef.current) return null

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!

      mediaRecorder.onstop = async () => {
        setIsRecording(false)
        setIsTranscribing(true)

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }

        const startTime = performance.now()

        try {
          // Create audio blob
          const mimeType = mediaRecorder.mimeType
          const blob = new Blob(chunksRef.current, { type: mimeType })

          console.log('Audio blob created:', blob.size, 'bytes,', mimeType)

          if (pipelineRef.current && blob.size > 0) {
            try {
              // Convert blob to audio data
              const audioData = await convertBlobToAudioData(blob)
              console.log('Audio data length:', audioData.length, 'samples')

              if (audioData.length < 1600) { // Less than 0.1 second
                throw new Error('Recording too short')
              }

              // Transcribe using Whisper with the Float32Array
              const result = await pipelineRef.current(audioData, {
                language: 'english',
                task: 'transcribe',
                chunk_length_s: 30,
                stride_length_s: 5,
              })

              console.log('Whisper result:', result)

              // Extract text from result
              let text = ''
              if (typeof result === 'string') {
                text = result
              } else if (Array.isArray(result)) {
                text = result.map((r) => r.text || '').join(' ')
              } else if (result && typeof result === 'object') {
                const asrResult = result as AutomaticSpeechRecognitionOutput
                text = asrResult.text || ''
              }

              text = text.trim()

              if (!text) {
                text = '[No speech detected]'
              }

              setTranscript(text)

              resolve({
                text,
                language: 'en',
                processingTime: performance.now() - startTime,
              })
            } catch (e) {
              console.error('Transcription processing error:', e)
              const errorMsg = e instanceof Error ? e.message : 'Unknown error'
              setError(`Transcription failed: ${errorMsg}`)
              resolve({
                text: '[Transcription failed - audio recorded]',
                language: 'en',
                processingTime: performance.now() - startTime,
              })
            }
          } else {
            // No pipeline or empty recording
            const text = blob.size === 0
              ? '[No audio recorded]'
              : '[Speech model not loaded]'
            setTranscript(text)
            resolve({
              text,
              language: 'en',
              processingTime: performance.now() - startTime,
            })
          }
        } catch (e) {
          console.error('Recording error:', e)
          setError('Failed to process audio')
          resolve(null)
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.stop()
    })
  }, [])

  return {
    isRecording,
    isTranscribing,
    transcript,
    startRecording,
    stopRecording,
    isModelLoading,
    modelLoadingProgress,
    error,
  }
}
