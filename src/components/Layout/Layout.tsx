import { ReactNode } from 'react'
import Header from './Header'
import Navigation from './Navigation'
import OfflineIndicator from './OfflineIndicator'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <OfflineIndicator />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {children}
      </main>
      <Navigation />
    </div>
  )
}
