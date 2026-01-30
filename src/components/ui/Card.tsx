import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/designTokens'

export type CardVariant = 'default' | 'flat' | 'elevated'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  hover?: boolean
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white rounded-2xl shadow-sm border border-gray-100',
  flat: 'bg-white rounded-xl border border-gray-200',
  elevated: 'bg-white rounded-2xl shadow-md border border-gray-100',
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          variantStyles[variant],
          paddingStyles[padding],
          hover && 'hover:shadow-md hover:border-gray-200 transition-all cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
