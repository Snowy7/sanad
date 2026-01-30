import { QuickSuggestion } from '../../lib/chatPrompts'
import { cn } from '../../lib/designTokens'
import { Sparkles } from 'lucide-react'

interface QuickSuggestionsProps {
  suggestions: QuickSuggestion[]
  onSelect: (query: string) => void
  disabled?: boolean
}

export default function QuickSuggestions({
  suggestions,
  onSelect,
  disabled = false,
}: QuickSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="px-3 py-2 border-t border-gray-100">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
        <Sparkles className="w-3 h-3" />
        <span>Quick questions</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion.query || suggestion.text)}
            disabled={disabled}
            className={cn(
              'px-2.5 py-1 text-xs rounded-full',
              'bg-gray-100 text-gray-700',
              'hover:bg-primary-50 hover:text-primary-700',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {suggestion.text}
          </button>
        ))}
      </div>
    </div>
  )
}
