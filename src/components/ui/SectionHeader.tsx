import { ReactNode } from 'react'
import { cn } from '../../lib/designTokens'
import { LucideIcon } from 'lucide-react'

export type SectionHeaderVariant = 'default' | 'compact'

interface SectionHeaderProps {
  icon?: LucideIcon
  iconColor?: string
  title: string
  description?: string
  variant?: SectionHeaderVariant
  action?: ReactNode
  className?: string
}

export default function SectionHeader({
  icon: Icon,
  iconColor = 'text-primary-600',
  title,
  description,
  variant = 'default',
  action,
  className,
}: SectionHeaderProps) {
  const isCompact = variant === 'compact'

  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            className={cn(
              'flex items-center justify-center rounded-lg',
              isCompact ? 'w-8 h-8' : 'w-10 h-10',
              'bg-gray-100'
            )}
          >
            <Icon className={cn(isCompact ? 'w-4 h-4' : 'w-5 h-5', iconColor)} />
          </div>
        )}
        <div>
          <h3
            className={cn(
              'font-semibold text-gray-900',
              isCompact ? 'text-sm' : 'text-base'
            )}
          >
            {title}
          </h3>
          {description && (
            <p
              className={cn(
                'text-gray-500 mt-0.5',
                isCompact ? 'text-xs' : 'text-sm'
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
