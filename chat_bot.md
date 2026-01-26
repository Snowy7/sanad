# Voice-Enabled Medical Assessment Chatbot

## Overview

This document outlines the technical approach for implementing a conversational AI assistant that can guide users through the medical triage assessment using voice input and output.

## Core Features

### Voice Input (Speech-to-Text)
- Accept voice input for all assessment fields: name, age, vitals, symptoms, chief complaint
- Support for Arabic and English languages
- Real-time transcription with visual feedback

### Voice Output (Text-to-Speech)
- AI reads questions and prompts aloud
- Provides verbal guidance and suggestions
- Confirms entries back to user
- Announces triage results and recommendations

### Conversational Flow
- Natural language understanding for medical context
- Smart field extraction from free-form speech
- Contextual follow-up questions
- Error correction and clarification

---

## Technical Implementation Options

### Option 1: Fully Local (Recommended for Offline-First)

**Speech-to-Text: Whisper via @huggingface/transformers**
```typescript
// Already partially implemented in useSpeechToText.ts
import { pipeline } from '@huggingface/transformers';

const transcriber = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-small', // Multilingual: Arabic + English
  { device: 'webgpu' }    // GPU acceleration if available
);

const result = await transcriber(audioBlob, {
  language: 'ar',         // or 'en', or auto-detect
  task: 'transcribe'
});
```

**Text-to-Speech: Web Speech API (Built-in)**
```typescript
const speak = (text: string, lang: 'ar' | 'en' = 'en') => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
  utterance.rate = 0.9;  // Slightly slower for clarity
  speechSynthesis.speak(utterance);
};
```

**Conversational Logic: Rule-Based + Pattern Matching**
```typescript
interface ConversationState {
  currentField: 'name' | 'age' | 'gender' | 'vitals' | 'symptoms' | 'complaint';
  collectedData: Partial<AssessmentFormState>;
  lastQuestion: string;
  retryCount: number;
}

const extractors = {
  name: (text: string) => {
    // Pattern: "my name is X" or "I am X" or just a name
    const patterns = [
      /my name is (\w+)/i,
      /i am (\w+)/i,
      /call me (\w+)/i,
      /^([A-Z][a-z]+)$/  // Just a capitalized word
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  },

  age: (text: string) => {
    const match = text.match(/(\d{1,3})\s*(years?|yrs?|y\.?o\.?)?/i);
    if (match) {
      const age = parseInt(match[1]);
      if (age > 0 && age < 150) return age;
    }
    return null;
  },

  bloodPressure: (text: string) => {
    // "120 over 80" or "120/80" or "one twenty over eighty"
    const match = text.match(/(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/i);
    if (match) {
      return { systolic: parseInt(match[1]), diastolic: parseInt(match[2]) };
    }
    return null;
  },

  heartRate: (text: string) => {
    const match = text.match(/(\d{2,3})\s*(?:bpm|beats|pulse)?/i);
    if (match) {
      const hr = parseInt(match[1]);
      if (hr >= 30 && hr <= 250) return hr;
    }
    return null;
  },

  temperature: (text: string) => {
    const match = text.match(/(\d{2,3}(?:\.\d)?)\s*(?:degrees?|°|celsius|fahrenheit|c|f)?/i);
    if (match) {
      let temp = parseFloat(match[1]);
      // Convert Fahrenheit to Celsius if needed
      if (temp > 50) temp = (temp - 32) * 5/9;
      if (temp >= 35 && temp <= 42) return temp;
    }
    return null;
  },

  oxygenSaturation: (text: string) => {
    const match = text.match(/(\d{2,3})\s*(?:percent|%|spo2|oxygen|sat)/i);
    if (match) {
      const spo2 = parseInt(match[1]);
      if (spo2 >= 50 && spo2 <= 100) return spo2;
    }
    return null;
  }
};
```

**Pros:**
- Works completely offline
- No API costs
- Privacy-preserving (all data stays local)
- Fast response times after model loads

**Cons:**
- ~244MB model download for Whisper-small
- Limited conversational intelligence (rule-based)
- TTS voice quality varies by browser/device

---

### Option 2: Hybrid (Local STT + Cloud LLM)

**Speech-to-Text: Local Whisper** (same as Option 1)

**Conversational Logic: Claude API via Anthropic SDK**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true // Only for demo; use backend in production
});

const systemPrompt = `You are a medical triage assistant helping collect patient information.
Current assessment state: ${JSON.stringify(state)}

Your job:
1. Extract structured data from user's speech
2. Ask clarifying questions if unclear
3. Guide through: name, age, gender, vitals, symptoms, chief complaint
4. Be empathetic and professional
5. Respond in the same language the user speaks (Arabic or English)

Respond in JSON format:
{
  "extractedData": { ... },
  "nextQuestion": "...",
  "language": "en" | "ar",
  "confidence": 0.0-1.0
}`;

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 500,
  system: systemPrompt,
  messages: [{ role: 'user', content: transcribedText }]
});
```

**Text-to-Speech: ElevenLabs or OpenAI TTS** (for better quality)
```typescript
// ElevenLabs for high-quality multilingual TTS
const speak = async (text: string, voice: string = 'Rachel') => {
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voice, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  const audioBlob = await response.blob();
  const audio = new Audio(URL.createObjectURL(audioBlob));
  audio.play();
};
```

**Pros:**
- Much smarter conversational ability
- Better handling of edge cases and natural language
- High-quality voice output

**Cons:**
- Requires internet for LLM calls
- API costs (Claude ~$3/1M input tokens, ElevenLabs ~$0.30/1K chars)
- Latency for API round-trips
- Not fully offline

---

### Option 3: Small Local LLM (Experimental)

**Speech-to-Text: Local Whisper** (same as above)

**Conversational Logic: Phi-3-mini or Gemma-2B via WebLLM**
```typescript
import { CreateMLCEngine } from '@anthropic-ai/webllm';

const engine = await CreateMLCEngine('Phi-3-mini-4k-instruct-q4f16_1-MLC');

const response = await engine.chat.completions.create({
  messages: [
    { role: 'system', content: medicalAssistantPrompt },
    { role: 'user', content: transcribedText }
  ],
  temperature: 0.3,
  max_tokens: 200
});
```

**Pros:**
- Fully offline
- Better than rule-based
- No API costs

**Cons:**
- Large download (~2-4GB for quantized models)
- Slower inference on CPU
- Less capable than Claude
- WebGPU required for reasonable speed

---

## Recommended Architecture

For a hackathon demo that balances offline capability with intelligence:

```
┌─────────────────────────────────────────────────────────────┐
│                    Voice Assessment Flow                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Record    │───▶│   Whisper   │───▶│   Extract   │     │
│  │   Audio     │    │   (Local)   │    │   Data      │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                               │             │
│                                               ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Speak     │◀───│   Generate  │◀───│   Validate  │     │
│  │   Response  │    │   Response  │    │   & Store   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Steps

1. **Phase 1: Voice Input Foundation**
   - Integrate Whisper for transcription (already partial)
   - Add language detection
   - Build audio recording UI with waveform visualization

2. **Phase 2: Rule-Based Extraction**
   - Implement extractors for all fields
   - Build conversation state machine
   - Add confirmation prompts

3. **Phase 3: Voice Output**
   - Integrate Web Speech API for TTS
   - Add Arabic voice support
   - Build interruptible playback

4. **Phase 4: Smart Suggestions**
   - Add symptom suggestions based on chief complaint
   - Vital range validation with verbal warnings
   - Contextual follow-up questions

---

## Conversation Flow Example

```
AI: "Welcome to SANAD triage assistant. What is the patient's name?"
User: "His name is Ahmed"
AI: "Ahmed. And how old is Ahmed?"
User: "He's 45 years old"
AI: "45 years old. What is the patient's gender?"
User: "Male"
AI: "Thank you. Now let's record the vital signs. What is the blood pressure?"
User: "120 over 80"
AI: "Blood pressure 120 over 80, that's normal. Heart rate?"
User: "92 beats per minute"
AI: "Heart rate 92, slightly elevated. Oxygen saturation?"
User: "97 percent"
AI: "SpO2 97%, good. What is the patient's temperature?"
User: "38.5 degrees"
AI: "Temperature 38.5 Celsius, that's a fever. What symptoms is the patient experiencing?"
User: "He has difficulty breathing and chest pain"
AI: "I've noted difficulty breathing and chest pain - these are concerning symptoms.
     Any other symptoms?"
User: "No, that's all"
AI: "Thank you. What is the main reason for this visit?"
User: "He started having trouble breathing after exercise"
AI: "Assessment complete. Based on the fever, difficulty breathing, and chest pain,
     this patient is classified as URGENT priority. Recommend immediate cardiac
     and respiratory evaluation."
```

---

## File Structure

```
src/
├── components/
│   └── VoiceAssistant/
│       ├── VoiceAssistant.tsx      # Main component
│       ├── VoiceButton.tsx         # Push-to-talk button
│       ├── Waveform.tsx            # Audio visualization
│       └── TranscriptDisplay.tsx   # Live transcript
├── hooks/
│   ├── useVoiceAssistant.ts        # Main orchestration hook
│   ├── useSpeechToText.ts          # Whisper integration (existing)
│   ├── useTextToSpeech.ts          # TTS wrapper
│   └── useConversationState.ts     # State machine
├── lib/
│   ├── extractors/
│   │   ├── nameExtractor.ts
│   │   ├── vitalsExtractor.ts
│   │   └── symptomsExtractor.ts
│   └── voicePrompts.ts             # Predefined prompts (en/ar)
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@huggingface/transformers": "^3.4.1",  // Already present
    // Optional for cloud TTS:
    // "@anthropic-ai/sdk": "^0.27.0",
    // "elevenlabs-js": "^0.1.0"
  }
}
```

---

## Estimated Implementation Time

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Voice input with Whisper | 4-6 hours |
| 2 | Rule-based extractors | 3-4 hours |
| 3 | Web Speech API TTS | 2-3 hours |
| 4 | Conversation state machine | 4-5 hours |
| 5 | Arabic language support | 2-3 hours |
| 6 | UI/UX polish | 3-4 hours |
| **Total** | | **18-25 hours** |

---

## Privacy & Security Considerations

1. **All voice data processed locally** - No audio sent to servers (with local Whisper)
2. **No PII stored in logs** - Transcripts only kept in session
3. **Consent required** - Microphone permission clearly requested
4. **Data retention** - Voice recordings deleted after transcription

---

## Accessibility Notes

- Visual feedback for hearing-impaired users
- Text alternative for all voice interactions
- Adjustable speech rate for TTS
- Support for both push-to-talk and voice activation
