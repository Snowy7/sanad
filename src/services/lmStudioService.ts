import { LMStudioConfig } from '../store/settingsStore'
import { ChatMessage, VLMAnalysisResult } from '../types'

const RADIOLOGY_SYSTEM_PROMPT = `You are a clinical radiology AI assistant integrated into a medical triage system. Your role is to assist healthcare professionals by analyzing chest X-ray images and answering clinical questions.

## Your Capabilities
- Analyze chest radiographs for common pathologies
- Identify anatomical structures and abnormalities
- Provide differential diagnoses when appropriate
- Answer follow-up questions about findings

## Response Guidelines

### For Initial X-ray Analysis
Provide a structured report with these sections:

**TECHNIQUE**: Brief note on image quality and positioning (AP/PA, rotation, inspiration)

**FINDINGS**: Systematic review of:
- Lungs (parenchyma, interstitium)
- Pleura (effusions, pneumothorax)
- Mediastinum (cardiac silhouette, aortic contour)
- Bones (ribs, spine, clavicles)
- Soft tissues

**IMPRESSIONS**: Key findings ranked by clinical significance

**RECOMMENDATIONS**: Suggested follow-up if warranted

**SEVERITY**: Overall assessment
- NORMAL: No significant abnormalities
- MILD: Minor findings, routine follow-up
- MODERATE: Findings requiring clinical correlation
- SEVERE: Significant pathology requiring attention
- CRITICAL: Urgent findings requiring immediate action

### For Follow-up Questions
- Be concise and directly address the question
- Reference specific areas of the image when relevant
- Acknowledge uncertainty when appropriate
- Suggest additional views or imaging if helpful

## Important Notes
- Always emphasize that AI analysis is for decision support only
- Clinical correlation and physician judgment are essential
- Do not provide definitive diagnoses - suggest possibilities
- Be clear about limitations (image quality issues, overlapping structures)`

export interface LMStudioMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>
}

interface LMStudioResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class LMStudioService {
  private config: LMStudioConfig | null = null

  setConfig(config: LMStudioConfig) {
    this.config = config
  }

  private getBaseUrl(): string {
    if (!this.config) {
      throw new Error('LM Studio config not set')
    }
    // Remove trailing slash if present
    return this.config.serverUrl.replace(/\/$/, '')
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (this.config?.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }
    return headers
  }

  async checkConnection(): Promise<{ connected: boolean; error?: string; models?: string[] }> {
    if (!this.config) {
      return { connected: false, error: 'LM Studio config not set' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/v1/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        return {
          connected: false,
          error: `Server returned ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      const models = data.data?.map((m: { id: string }) => m.id) || []

      return {
        connected: true,
        models,
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          return { connected: false, error: 'Connection timeout - server not responding' }
        }
        return { connected: false, error: error.message }
      }
      return { connected: false, error: 'Unknown connection error' }
    }
  }

  async analyzeXray(imageBase64: string): Promise<{ result: VLMAnalysisResult; rawResponse: string }> {
    if (!this.config) {
      throw new Error('LM Studio config not set')
    }

    const messages: LMStudioMessage[] = [
      {
        role: 'system',
        content: RADIOLOGY_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Please analyze this chest X-ray image.' },
          { type: 'image_url', image_url: { url: imageBase64 } },
        ],
      },
    ]

    const response = await this.sendRequest(messages)
    const rawResponse = response.choices[0]?.message?.content || ''

    return {
      result: this.parseAnalysisResponse(rawResponse),
      rawResponse,
    }
  }

  async askFollowUp(
    imageBase64: string,
    conversationHistory: ChatMessage[],
    question: string
  ): Promise<string> {
    if (!this.config) {
      throw new Error('LM Studio config not set')
    }

    // Build messages with full conversation context
    const messages: LMStudioMessage[] = [
      {
        role: 'system',
        content: RADIOLOGY_SYSTEM_PROMPT,
      },
    ]

    // Add the initial image analysis request
    if (conversationHistory.length > 0) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Please analyze this chest X-ray image.' },
          { type: 'image_url', image_url: { url: imageBase64 } },
        ],
      })

      // Add conversation history (skip the first message if it's the initial analysis)
      for (const msg of conversationHistory) {
        if (msg.role === 'assistant' || msg.role === 'user') {
          messages.push({
            role: msg.role,
            content: msg.content,
          })
        }
      }
    }

    // Add the new question
    messages.push({
      role: 'user',
      content: question,
    })

    const response = await this.sendRequest(messages, 1024) // Shorter response for follow-ups
    return response.choices[0]?.message?.content || ''
  }

  private async sendRequest(messages: LMStudioMessage[], maxTokens?: number): Promise<LMStudioResponse> {
    if (!this.config) {
      throw new Error('LM Studio config not set')
    }

    const response = await fetch(`${this.getBaseUrl()}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.config.modelName,
        messages,
        max_tokens: maxTokens || this.config.maxTokens,
        temperature: this.config.temperature,
      }),
      signal: AbortSignal.timeout(120000), // 2 minute timeout for analysis
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LM Studio API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  private parseAnalysisResponse(response: string): VLMAnalysisResult {
    // Parse structured response from the VLM
    const result: VLMAnalysisResult = {
      findings: '',
      impressions: [],
      recommendations: [],
      severity: 'moderate',
    }

    // Extract technique section
    const techniqueMatch = response.match(/\*\*TECHNIQUE\*\*:?\s*([\s\S]*?)(?=\*\*[A-Z]|$)/i)
    if (techniqueMatch) {
      result.technique = techniqueMatch[1].trim()
    }

    // Extract findings section
    const findingsMatch = response.match(/\*\*FINDINGS\*\*:?\s*([\s\S]*?)(?=\*\*[A-Z]|$)/i)
    if (findingsMatch) {
      result.findings = findingsMatch[1].trim()
    } else {
      // If no structured findings, use the whole response
      result.findings = response
    }

    // Extract impressions section
    const impressionsMatch = response.match(/\*\*IMPRESSIONS?\*\*:?\s*([\s\S]*?)(?=\*\*[A-Z]|$)/i)
    if (impressionsMatch) {
      const impressionsText = impressionsMatch[1].trim()
      // Split by numbered items or bullet points
      result.impressions = impressionsText
        .split(/\n(?=\d+\.|[-*•])/)
        .map((s) => s.replace(/^[\d.\-*•\s]+/, '').trim())
        .filter((s) => s.length > 0)
    }

    // Extract recommendations section
    const recommendationsMatch = response.match(/\*\*RECOMMENDATIONS?\*\*:?\s*([\s\S]*?)(?=\*\*[A-Z]|$)/i)
    if (recommendationsMatch) {
      const recsText = recommendationsMatch[1].trim()
      result.recommendations = recsText
        .split(/\n(?=\d+\.|[-*•])/)
        .map((s) => s.replace(/^[\d.\-*•\s]+/, '').trim())
        .filter((s) => s.length > 0)
    }

    // Extract severity
    const severityMatch = response.match(/\*\*SEVERITY\*\*:?\s*(\w+)/i)
    if (severityMatch) {
      const severityText = severityMatch[1].toLowerCase()
      if (['normal', 'mild', 'moderate', 'severe', 'critical'].includes(severityText)) {
        result.severity = severityText as VLMAnalysisResult['severity']
      }
    } else {
      // Try to infer severity from content
      const lowerResponse = response.toLowerCase()
      if (lowerResponse.includes('critical') || lowerResponse.includes('urgent') || lowerResponse.includes('immediate')) {
        result.severity = 'critical'
      } else if (lowerResponse.includes('severe') || lowerResponse.includes('significant')) {
        result.severity = 'severe'
      } else if (lowerResponse.includes('mild') || lowerResponse.includes('minor')) {
        result.severity = 'mild'
      } else if (lowerResponse.includes('normal') || lowerResponse.includes('unremarkable') || lowerResponse.includes('no significant')) {
        result.severity = 'normal'
      }
    }

    return result
  }
}

// Export singleton instance
export const lmStudioService = new LMStudioService()
