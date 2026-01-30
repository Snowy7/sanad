import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LMStudioConfig {
  serverUrl: string
  modelName: string
  apiKey?: string
  maxTokens: number
  temperature: number
}

export type XrayModelType = 'onnx' | 'lmstudio'

interface SettingsState {
  xrayModel: XrayModelType
  lmStudioConfig: LMStudioConfig
  lmStudioConnectionStatus: 'unknown' | 'checking' | 'connected' | 'disconnected' | 'error'
  lmStudioConnectionError: string | null
  setXrayModel: (model: XrayModelType) => void
  setLMStudioConfig: (config: Partial<LMStudioConfig>) => void
  setLMStudioConnectionStatus: (status: SettingsState['lmStudioConnectionStatus'], error?: string | null) => void
}

const defaultLMStudioConfig: LMStudioConfig = {
  serverUrl: 'http://localhost:1234',
  modelName: 'qwen3-vl-radiology-v1',
  maxTokens: 2048,
  temperature: 0.1,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      xrayModel: 'onnx',
      lmStudioConfig: defaultLMStudioConfig,
      lmStudioConnectionStatus: 'unknown',
      lmStudioConnectionError: null,

      setXrayModel: (model) => set({ xrayModel: model }),

      setLMStudioConfig: (config) =>
        set((state) => ({
          lmStudioConfig: { ...state.lmStudioConfig, ...config },
          // Reset connection status when config changes
          lmStudioConnectionStatus: 'unknown',
          lmStudioConnectionError: null,
        })),

      setLMStudioConnectionStatus: (status, error = null) =>
        set({
          lmStudioConnectionStatus: status,
          lmStudioConnectionError: error,
        }),
    }),
    {
      name: 'sanad-settings',
      partialize: (state) => ({
        xrayModel: state.xrayModel,
        lmStudioConfig: state.lmStudioConfig,
      }),
    }
  )
)
