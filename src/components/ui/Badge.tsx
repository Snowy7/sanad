import { HTMLAttributes, forwardRef } from 'react'
import { cn, triageColors, imagingColors, triageLabels, imagingLabels } from '../../lib/designTokens'
import { TriagePriority, ImagingUrgency } from '../../types'

export type BadgeVariant = 'triage' | 'imaging' | 'custom'
export type BadgeSize = 'sm' | 'md' | 'lg'

interface BaseBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  size?: BadgeSize
}

interface TriageBadgeProps extends BaseBadgeProps {
  variant: 'triage'
  priority: TriagePriority
  solid?: boolean
}

interface ImagingBadgeProps extends BaseBadgeProps {
  variant: 'imaging'
  urgency: ImagingUrgency
  solid?: boolean
}

interface CustomBadgeProps extends BaseBadgeProps {
  variant?: 'custom'
  colorClass?: string
}

type BadgeProps = TriageBadgeProps | ImagingBadgeProps | CustomBadgeProps

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>((props, ref) => {
  const { className, size = 'md', children, ...rest } = props

  let colorClasses = ''
  let label = children

  if (props.variant === 'triage') {
    const colors = triageColors[props.priority]
    colorClasses = props.solid
      ? `${colors.solid} ${colors.solidText}`
      : `${colors.bg} ${colors.text} border ${colors.border}`
    label = label || triageLabels[props.priority]
  } else if (props.variant === 'imaging') {
    const colors = imagingColors[props.urgency]
    colorClasses = props.solid
      ? `${colors.solid} ${colors.solidText}`
      : `${colors.bg} ${colors.text} border ${colors.border}`
    label = label || imagingLabels[props.urgency]
  } else {
    colorClasses = (props as CustomBadgeProps).colorClass || 'bg-gray-100 text-gray-600'
  }

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        sizeStyles[size],
        colorClasses,
        className
      )}
      {...rest}
    >
      {label}
    </span>
  )
})

Badge.displayName = 'Badge'

export default Badge
