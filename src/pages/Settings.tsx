import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Server, Cpu, Sparkles, Wifi, WifiOff, Loader2, Check, AlertCircle } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { lmStudioService } from '../services/lmStudioService'

export default function Settings() {
  const {
    xrayModel,
    setXrayModel,
    lmStudioConfig,
    setLMStudioConfig,
    lmStudioConnectionStatus,
    setLMStudioConnectionStatus,
    lmStudioConnectionError,
  } = useSettingsStore()

  const [serverUrl, setServerUrl] = useState(lmStudioConfig.serverUrl)
  const [modelName, setModelName] = useState(lmStudioConfig.modelName)
  const [apiKey, setApiKey] = useState(lmStudioConfig.apiKey || '')
  const [maxTokens, setMaxTokens] = useState(lmStudioConfig.maxTokens)
  const [temperature, setTemperature] = useState(lmStudioConfig.temperature)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')

  // Update service config when settings change
  useEffect(() => {
    lmStudioService.setConfig(lmStudioConfig)
  }, [lmStudioConfig])

  const handleTestConnection = async () => {
    setLMStudioConnectionStatus('checking')

    // Save current config first
    setLMStudioConfig({
      serverUrl,
      modelName,
      apiKey: apiKey || undefined,
      maxTokens,
      temperature,
    })

    try {
      const result = await lmStudioService.checkConnection()

      if (result.connected) {
        setLMStudioConnectionStatus('connected')
        if (result.models) {
          setAvailableModels(result.models)
        }
      } else {
        setLMStudioConnectionStatus('error', result.error)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Connection failed'
      setLMStudioConnectionStatus('error', message)
    }
  }

  const handleSaveConfig = () => {
    setLMStudioConfig({
      serverUrl,
      modelName,
      apiKey: apiKey || undefined,
      maxTokens,
      temperature,
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary-100 p-3 rounded-xl">
          <SettingsIcon className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Configure AI models and preferences</p>
        </div>
      </div>

      {/* X-ray Model Selection */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">X-Ray Analysis Model</h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose which AI model to use for X-ray analysis.
        </p>

        <div className="space-y-3">
          <label
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              xrayModel === 'onnx'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="xrayModel"
              value="onnx"
              checked={xrayModel === 'onnx'}
              onChange={() => setXrayModel('onnx')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-gray-800">Chest X-ray Model (ONNX)</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Recommended</span>
              </div>
              <p className="text-sm text-gray-600">
                Fast local inference using ONNX Runtime. Detects 18 pathologies with CAM heatmaps.
                Works completely offline after initial model download.
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              xrayModel === 'lmstudio'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="xrayModel"
              value="lmstudio"
              checked={xrayModel === 'lmstudio'}
              onChange={() => setXrayModel('lmstudio')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-800">Advanced Radiology AI (LM Studio)</span>
                {lmStudioConnectionStatus === 'connected' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Detailed text-based analysis using a vision-language model. Provides clinical recommendations
                and interactive Q&A. Requires LM Studio server running locally.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* LM Studio Configuration */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">LM Studio Configuration</h2>
        </div>

        <div className="space-y-4">
          {/* Server URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server URL
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:1234"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default LM Studio server runs on port 1234
            </p>
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Name
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="qwen3-vl-radiology-v1"
              className="input"
            />
            {availableModels.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Available models:</p>
                <div className="flex flex-wrap gap-1">
                  {availableModels.map((model) => (
                    <button
                      key={model}
                      onClick={() => setModelName(model)}
                      className={`text-xs px-2 py-1 rounded-full transition-colors ${
                        modelName === model
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* API Key (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key (optional)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Leave empty if not required"
              className="input"
            />
          </div>

          {/* Advanced Settings */}
          <details className="group">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
              Advanced Settings
            </summary>
            <div className="mt-3 space-y-4 pl-4 border-l-2 border-gray-200">
              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tokens: {maxTokens}
                </label>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature: {temperature.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Lower = more focused, Higher = more creative
                </p>
              </div>
            </div>
          </details>

          {/* Connection Status */}
          {lmStudioConnectionStatus !== 'unknown' && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 ${
                lmStudioConnectionStatus === 'connected'
                  ? 'bg-green-50 text-green-700'
                  : lmStudioConnectionStatus === 'checking'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {lmStudioConnectionStatus === 'checking' && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {lmStudioConnectionStatus === 'connected' && (
                <Wifi className="w-4 h-4" />
              )}
              {(lmStudioConnectionStatus === 'disconnected' || lmStudioConnectionStatus === 'error') && (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="text-sm">
                {lmStudioConnectionStatus === 'checking' && 'Checking connection...'}
                {lmStudioConnectionStatus === 'connected' && 'Connected to LM Studio server'}
                {lmStudioConnectionStatus === 'disconnected' && (lmStudioConnectionError || 'Server not available')}
                {lmStudioConnectionStatus === 'error' && (lmStudioConnectionError || 'Connection error')}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleTestConnection}
              disabled={lmStudioConnectionStatus === 'checking'}
              className="btn-secondary flex items-center gap-2"
            >
              {lmStudioConnectionStatus === 'checking' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              Test Connection
            </button>
            <button
              onClick={handleSaveConfig}
              className="btn-primary flex items-center gap-2"
            >
              {saveStatus === 'saved' ? (
                <Check className="w-4 h-4" />
              ) : (
                <SettingsIcon className="w-4 h-4" />
              )}
              {saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-1">About LM Studio Integration</h3>
            <p className="text-sm text-blue-700">
              LM Studio is a desktop application for running large language models locally.
              To use the Advanced Radiology AI feature:
            </p>
            <ol className="text-sm text-blue-700 list-decimal list-inside mt-2 space-y-1">
              <li>Download and install LM Studio from lmstudio.ai</li>
              <li>Download a vision-language model (e.g., qwen3-vl-radiology)</li>
              <li>Start the local server in LM Studio (default port: 1234)</li>
              <li>Test the connection using the button above</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
