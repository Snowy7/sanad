import { NavLink } from 'react-router-dom'
import { Home, ClipboardPlus, Users, Scan, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Home', onboardingId: 'nav-home' },
  { to: '/assessment', icon: ClipboardPlus, label: 'Assess', onboardingId: 'nav-assess' },
  { to: '/queue', icon: Users, label: 'Queue', onboardingId: 'nav-queue' },
  { to: '/imaging-queue', icon: Scan, label: 'Imaging', onboardingId: 'nav-imaging' },
  { to: '/settings', icon: Settings, label: 'Settings', onboardingId: 'nav-settings' },
]

export default function Navigation() {
  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50 shadow-lg">
      <div className="container mx-auto max-w-4xl lg:max-w-6xl xl:max-w-7xl">
        <div className="flex justify-around">
          {navItems.map(({ to, icon: Icon, label, onboardingId }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 px-6 transition-colors ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
              data-onboarding={onboardingId}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium mt-1">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
