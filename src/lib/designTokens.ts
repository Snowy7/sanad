// Design System - Single Source of Truth
// All colors, spacing, and styling tokens for the SANAD application

import { TriagePriority, ImagingUrgency } from '../types'

// ============================================================================
// TRIAGE COLORS
// ============================================================================

// Light theme triage colors (for backgrounds, cards, badges)
export const triageColors: Record<TriagePriority, {
  bg: string
  text: string
  border: string
  solid: string
  solidText: string
}> = {
  immediate: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    solid: 'bg-red-500',
    solidText: 'text-white',
  },
  urgent: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    solid: 'bg-amber-500',
    solidText: 'text-white',
  },
  delayed: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    solid: 'bg-green-500',
    solidText: 'text-white',
  },
  minimal: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    solid: 'bg-slate-400',
    solidText: 'text-white',
  },
}

// Triage labels
export const triageLabels: Record<TriagePriority, string> = {
  immediate: 'IMMEDIATE',
  urgent: 'URGENT',
  delayed: 'DELAYED',
  minimal: 'MINIMAL',
}

// Priority order (lower number = more urgent)
export const triagePriorityOrder: Record<TriagePriority, number> = {
  immediate: 0,
  urgent: 1,
  delayed: 2,
  minimal: 3,
}

// ============================================================================
// IMAGING URGENCY COLORS
// ============================================================================

export const imagingColors: Record<ImagingUrgency, {
  bg: string
  text: string
  border: string
  solid: string
  solidText: string
}> = {
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    solid: 'bg-red-500',
    solidText: 'text-white',
  },
  high: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    solid: 'bg-orange-500',
    solidText: 'text-white',
  },
  routine: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    solid: 'bg-blue-500',
    solidText: 'text-white',
  },
  'not-required': {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    solid: 'bg-gray-400',
    solidText: 'text-white',
  },
}

export const imagingLabels: Record<ImagingUrgency, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  routine: 'ROUTINE',
  'not-required': 'NOT REQUIRED',
}

// ============================================================================
// SEVERITY COLORS (for symptoms, findings, etc.)
// ============================================================================

export const severityColors = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
}

// Get severity color based on numeric value (1-10)
export function getSeverityColor(severity: number) {
  if (severity >= 8) return severityColors.high
  if (severity >= 5) return severityColors.medium
  return severityColors.low
}

// ============================================================================
// SPACING SCALE
// ============================================================================

export const spacing = {
  xs: '2',   // 0.5rem / 8px
  sm: '3',   // 0.75rem / 12px
  md: '4',   // 1rem / 16px
  lg: '6',   // 1.5rem / 24px
  xl: '8',   // 2rem / 32px
  '2xl': '12', // 3rem / 48px
} as const

// ============================================================================
// COMPONENT STYLES
// ============================================================================

// Button variants
export const buttonStyles = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-500',
  secondary: 'bg-white text-primary-700 border-2 border-primary-200 hover:bg-primary-50 active:bg-primary-100',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500',
} as const

// Card variants
export const cardStyles = {
  default: 'bg-white rounded-2xl shadow-sm border border-gray-100',
  flat: 'bg-white rounded-xl border border-gray-200',
  elevated: 'bg-white rounded-2xl shadow-md border border-gray-100',
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get triage color with fallback
export function getTriageColor(priority: TriagePriority | undefined | null) {
  return triageColors[priority || 'minimal']
}

// Get imaging color with fallback
export function getImagingColor(urgency: ImagingUrgency | undefined | null) {
  return imagingColors[urgency || 'not-required']
}

// Combine multiple class strings
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
