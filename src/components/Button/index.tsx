'use client'

import React from 'react'

/**
 * Unified Button System
 * Provides consistent button styling across the app
 */

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'modal-primary' | 'modal-danger'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right' | 'top'
  fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ 
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    children,
    disabled,
    className = '',
    ...props 
  }, ref) => {
    
    const variantStyles = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      tertiary: 'btn-tertiary',
      ghost: 'bg-transparent text-white hover:bg-white/10 border border-white/10 hover:border-white/20',
      danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50',
      'modal-primary': 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/50 shadow-[0_0_20px_rgba(var(--glass-tint-rgb),0.1)]',
      'modal-danger': 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
    }
    
    const sizeStyles = {
      xs: 'btn-xs px-2 py-1 text-[10px]',
      sm: 'btn-sm px-3 py-1.5 text-xs',
      md: 'btn-md px-6 py-1 text-sm',
      lg: 'btn-lg px-8 py-1.5 text-base',
      xl: 'btn-xl px-10 py-3 text-lg font-bold'
    }
    
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          ${variantStyles[variant]} 
          ${sizeStyles[size]} 
          ${fullWidth ? 'w-full' : ''} 
          ${iconPosition === 'top' ? 'flex-col py-1.5 px-4 min-w-[80px]' : 'flex-row'}
          flex items-center justify-center gap-2 transition-all duration-300 rounded-full font-bold active:scale-95
          ${className}
        `}
        {...props}
      >
        {isLoading && (
          <span className="material-symbols-outlined animate-spin">refresh</span>
        )}
        {!isLoading && icon && iconPosition === 'top' && (
          <span className="material-symbols-outlined text-2xl mb-0.5">{icon}</span>
        )}
        {!isLoading && icon && iconPosition === 'left' && (
           <span className="material-symbols-outlined text-xl">{icon}</span>
        )}
        {children && (
          <span className={iconPosition === 'top' ? 'text-[10px]' : ''}>
            {children}
          </span>
        )}
        {!isLoading && icon && iconPosition === 'right' && (
           <span className="material-symbols-outlined text-xl">{icon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

/* ============= Icon Button ============= */

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  tooltip?: string
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 
    icon, 
    variant = 'ghost',
    size = 'md',
    tooltip,
    className = '',
    ...props 
  }, ref) => {
    
    const sizeMap = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12'
    }
    
    const variantStyles = {
      primary: 'bg-primary text-black hover:scale-110',
      secondary: 'bg-secondary text-black hover:scale-110',
      ghost: 'text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/20',
      danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
    }
    
    return (
      <button
        ref={ref}
        className={`${sizeMap[size]} rounded-full flex items-center justify-center transition-all duration-300 ${variantStyles[variant]} border border-white/10 ${className}`}
        title={tooltip}
        {...props}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'

/* ============= Floating Action Button ============= */

interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  label?: string
}

export const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ icon, label, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`w-14 h-14 rounded-full bg-primary text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 font-bold flex-col gap-1 ${className}`}
        {...props}
      >
        <span className="material-symbols-outlined">{icon}</span>
        {label && <span className="text-xs font-bold">{label}</span>}
      </button>
    )
  }
)

FAB.displayName = 'FAB'

/* ============= Button Group ============= */

interface ButtonGroupProps {
  children: React.ReactNode
  vertical?: boolean
  className?: string
}

export function ButtonGroup({ children, vertical = false, className = '' }: ButtonGroupProps) {
  return (
    <div className={`flex ${vertical ? 'flex-col' : 'flex-row'} gap-3 ${className}`}>
      {children}
    </div>
  )
}
