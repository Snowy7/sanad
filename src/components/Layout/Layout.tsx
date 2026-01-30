import { ReactNode, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Navigation from './Navigation'
import OfflineIndicator from './OfflineIndicator'
import { ChatSidebar, ChatFAB } from '../Chat'
import { useChatContext, ChatPage } from '../../context/ChatContext'

interface LayoutProps {
  children: ReactNode
}

// Map routes to chat page context
function getPageFromPath(pathname: string): ChatPage {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/assessment')) return 'assessment'
  if (pathname.startsWith('/queue')) return 'queue'
  if (pathname.startsWith('/patient/')) return 'patient-detail'
  if (pathname.startsWith('/imaging')) return 'imaging'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'home'
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { isOpen, openChat, setContext } = useChatContext()

  // Update chat context when route changes
  useEffect(() => {
    const page = getPageFromPath(location.pathname)
    setContext({ page })
  }, [location.pathname, setContext])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <OfflineIndicator />
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-4xl lg:max-w-6xl xl:max-w-7xl">
        {children}
      </main>
      <Navigation />

      {/* Chat FAB - shown when chat is closed */}
      {!isOpen && <ChatFAB onClick={openChat} />}

      {/* Chat Sidebar */}
      <ChatSidebar />
    </div>
  )
}
