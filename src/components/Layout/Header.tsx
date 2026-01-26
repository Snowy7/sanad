import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="bg-primary-900 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl">
            <Heart className="w-7 h-7 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SANAD</h1>
            <p className="text-xs text-primary-200 font-medium">Smart AI Nurse Assistant for Disaster</p>
          </div>
        </Link>
      </div>
    </header>
  )
}
