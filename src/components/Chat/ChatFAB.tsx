import { MessageCircle } from 'lucide-react'

interface ChatFABProps {
  onClick: () => void
}

export default function ChatFAB({ onClick }: ChatFABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center md:bottom-6"
      aria-label="Open AI Chat"
    >
      <MessageCircle className="w-5 h-5" />
    </button>
  )
}
