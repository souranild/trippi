'use client'

import React from 'react'

/**
 * Unified Form Layout System
 * Provides consistent styling and structure for all forms, modals, and inputs across the app
 */

/* ============= Form Container ============= */

interface FormContainerProps {
  children: React.ReactNode
  className?: string
}

export function FormContainer({ children, className = '' }: FormContainerProps) {
  return (
    <div className={`flex flex-col h-full max-h-[85vh] ${className}`}>
      {children}
    </div>
  )
}

/* ============= Form Content (Scrollable) ============= */

interface FormContentProps {
  children: React.ReactNode
  className?: string
}

export function FormContent({ children, className = '' }: FormContentProps) {
  return (
    <div className={`flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-hide ${className}`}>
      {children}
    </div>
  )
}

/* ============= Form Section ============= */

interface FormSectionProps {
  children: React.ReactNode
  className?: string
}

export function FormSection({ children, className = '' }: FormSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  )
}

/* ============= Form Label ============= */

interface FormLabelProps {
  children: React.ReactNode
  htmlFor?: string
  variant?: 'primary' | 'secondary' | 'tertiary' | 'default'
  className?: string
}

export function FormLabel({ 
  children, 
  htmlFor, 
  variant = 'default',
  className = ''
}: FormLabelProps) {
  const variantStyles = {
    primary: 'text-xs font-bold text-primary',
    secondary: 'text-xs font-bold text-secondary',
    tertiary: 'text-xs font-bold text-tertiary',
    default: 'text-sm font-medium text-neutral-300'
  }
  
  return (
    <label htmlFor={htmlFor} className={`block mb-1 ${variantStyles[variant]} ${className}`}>
      {children}
    </label>
  )
}

/* ============= Form Input ============= */

interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode
  labelVariant?: 'primary' | 'secondary' | 'tertiary' | 'default'
  containerClassName?: string
  error?: string
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ 
    label, 
    labelVariant = 'default',
    containerClassName = '',
    error,
    className = '',
    ...props 
  }, ref) => {
    return (
      <div className={`space-y-1 ${containerClassName}`}>
        {label && <FormLabel variant={labelVariant}>{label}</FormLabel>}
        <input
          ref={ref}
          className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:border-primary focus:outline-none transition-colors ${error ? 'border-red-500/50' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

/* ============= Form Input Group (with Actions) ============= */

interface FormInputGroupProps {
  label?: React.ReactNode
  labelVariant?: 'primary' | 'secondary' | 'tertiary' | 'default'
  children: React.ReactNode
  action?: React.ReactNode
  containerClassName?: string
}

export function FormInputGroup({
  label,
  labelVariant = 'default',
  children,
  action,
  containerClassName = ''
}: FormInputGroupProps) {
  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <div className="flex items-center justify-between">
          <FormLabel variant={labelVariant}>{label}</FormLabel>
          {action}
        </div>
      )}
      <div className="relative">
        {children}
      </div>
    </div>
  )
}

/* ============= Form Textarea ============= */

interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode
  labelVariant?: 'primary' | 'secondary' | 'tertiary' | 'default'
  containerClassName?: string
  error?: string
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ 
    label, 
    labelVariant = 'default',
    containerClassName = '',
    error,
    className = '',
    ...props 
  }, ref) => {
    return (
      <div className={`space-y-1 ${containerClassName}`}>
        {label && <FormLabel variant={labelVariant}>{label}</FormLabel>}
        <textarea
          ref={ref}
          className={`w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:border-primary focus:outline-none transition-colors resize-none text-sm ${error ? 'border-red-500/50' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

FormTextarea.displayName = 'FormTextarea'

/* ============= Form Select ============= */

interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode
  labelVariant?: 'primary' | 'secondary' | 'tertiary' | 'default'
  containerClassName?: string
  options: Array<{ value: string | number; label: string }>
  error?: string
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ 
    label, 
    labelVariant = 'default',
    containerClassName = '',
    options,
    error,
    className = '',
    ...props 
  }, ref) => {
    return (
      <div className={`space-y-1 ${containerClassName}`}>
        {label && <FormLabel variant={labelVariant}>{label}</FormLabel>}
        <select
          ref={ref}
          className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer ${error ? 'border-red-500/50' : ''} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-neutral-900">
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

FormSelect.displayName = 'FormSelect'

/* ============= Form Footer ============= */

interface FormFooterProps {
  children: React.ReactNode
  className?: string
}

export function FormFooter({ children, className = '' }: FormFooterProps) {
  return (
    <div className={`p-4 md:p-6 space-y-3 bg-white/5 backdrop-blur-xl shrink-0 border-t border-white/5 ${className}`}>
      {children}
    </div>
  )
}

/* ============= Form Button Group ============= */

interface FormButtonGroupProps {
  children: React.ReactNode
  className?: string
}

export function FormButtonGroup({ children, className = '' }: FormButtonGroupProps) {
  return (
    <div className={`flex gap-3 ${className}`}>
      {children}
    </div>
  )
}

/* ============= Grid Layout ============= */

interface FormGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3
  className?: string
}

export function FormGrid({ children, columns = 2, className = '' }: FormGridProps) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3'
  }[columns]
  
  return (
    <div className={`grid ${colsClass} gap-4 ${className}`}>
      {children}
    </div>
  )
}

/* ============= Form Group (for grouped fields) ============= */

interface FormGroupProps {
  children: React.ReactNode
  className?: string
}

export function FormGroup({ children, className = '' }: FormGroupProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  )
}

/* ============= Utility: List Item (for documents, links, events) ============= */

interface FormListItemProps {
  children: React.ReactNode
  onDelete?: () => void
  onClick?: () => void
  showDeleteOnHover?: boolean
  className?: string
}

export function FormListItem({ 
  children, 
  onDelete, 
  onClick,
  showDeleteOnHover = true,
  className = ''
}: FormListItemProps) {
  return (
    <div
      className={`bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 group ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex-1">{children}</div>
      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className={`text-neutral-500 hover:text-red-400 transition-all ${showDeleteOnHover ? 'opacity-0 group-hover:opacity-100' : ''}`}
        >
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
      )}
    </div>
  )
}

/* ============= Utility: Divider ============= */

export function FormDivider({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-white/5 ${className}`} />
}
