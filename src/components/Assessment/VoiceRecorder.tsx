import { useState } from 'react'
import { Mic, Square, Trash2, Loader2, Edit2, Check, X } from 'lucide-react'
import { VoiceNote } from '../../types'
import { useSpeechToText } from '../../hooks/useSpeechToText'

interface VoiceRecorderProps {
  notes: VoiceNote[]
  onChange: (notes: VoiceNote[]) => void
  additionalNotes: string
  onNotesChange: (notes: string) => void
}

export default function VoiceRecorder({
  notes,
  onChange,
  additionalNotes,
  onNotesChange,
}: VoiceRecorderProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const {
    isRecording,
    isTranscribing,
    transcript,
    startRecording,
    stopRecording,
    isModelLoading,
    modelLoadingProgress,
    error,
  } = useSpeechToText()

  const handleStartRecording = async () => {
    await startRecording()
  }

  const handleStopRecording = async () => {
    const result = await stopRecording()
    if (result) {
      const newNote: VoiceNote = {
        id: crypto.randomUUID(),
        transcript: result.text,
        createdAt: new Date(),
      }
      onChange([...notes, newNote])
    }
  }

  const deleteNote = (id: string) => {
    onChange(notes.filter((n) => n.id !== id))
  }

  const startEditing = (note: VoiceNote) => {
    setEditingId(note.id)
    setEditText(note.transcript)
  }

  const saveEdit = () => {
    if (editingId) {
      onChange(
        notes.map((n) =>
          n.id === editingId ? { ...n, transcript: editText } : n
        )
      )
      setEditingId(null)
      setEditText('')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary-100 p-3 rounded-xl">
          <Mic className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Voice Notes</h2>
          <p className="text-sm text-gray-500">
            Record clinical observations (optional)
          </p>
        </div>
      </div>

      {/* Model Loading */}
      {isModelLoading && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <p className="font-medium text-blue-700">Loading speech model...</p>
              <p className="text-sm text-blue-600">
                {modelLoadingProgress}% - This only happens once
              </p>
            </div>
          </div>
          <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${modelLoadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Record Button */}
      <div className="card flex flex-col items-center py-8">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isModelLoading || isTranscribing}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-primary-600 hover:bg-primary-500'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isTranscribing ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isRecording ? (
            <Square className="w-8 h-8 text-white" fill="currentColor" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
        <p className="mt-4 text-gray-700 font-medium">
          {isTranscribing
            ? 'Transcribing...'
            : isRecording
            ? 'Recording... Tap to stop'
            : 'Tap to record'}
        </p>

        {/* Live Transcript */}
        {transcript && isRecording && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg w-full">
            <p className="text-sm text-gray-700">{transcript}</p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Recorded Notes */}
      {notes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">Recorded Notes</h3>
          {notes.map((note) => (
            <div key={note.id} className="card p-4">
              {editingId === note.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="input min-h-[100px] resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={saveEdit}
                      className="p-2 text-primary-600 hover:text-primary-700"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-700">{note.transcript}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {new Date(note.createdAt).toLocaleTimeString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(note)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manual Notes */}
      <div>
        <label className="label">Additional Notes (Manual Entry)</label>
        <textarea
          value={additionalNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="input min-h-[120px] resize-none"
          placeholder="Type any additional observations here..."
        />
      </div>
    </div>
  )
}
