import { NavLink } from 'react-router-dom'
import { Home, ClipboardPlus, Users } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/assessment', icon: ClipboardPlus, label: 'New Assessment' },
  { to: '/queue', icon: Users, label: 'Patient Queue' },
]

export default function Navigation() {
  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50">
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-around">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 px-6 transition-colors ${
                  isActive
                    ? 'text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
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
