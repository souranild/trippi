'use client'

import React from 'react'

/**
 * Unified Modal Layout System
 * Provides consistent modal styling and structure across the app
 */

/* ============= Modal Backdrop ============= */

interface ModalBackdropProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export function ModalBackdrop({ children, onClick, className = '' }: ModalBackdropProps) {
  return (
    <div 
      className={`modal-backdrop p-4 md:p-8 animate-in fade-in duration-300 backdrop-blur-[2px] ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

/* ============= Modal Container ============= */

interface ModalContainerProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  tint?: string // Optional color tint, e.g., "rgba(59, 130, 246, 0.05)"
  className?: string
}

export function ModalContainer({ 
  children, 
  size = 'md',
  tint,
  className = ''
}: ModalContainerProps) {
  const sizeStyles = {
    sm: 'max-w-xl',      // 576px (was max-w-md 448px)
    md: 'max-w-3xl',    // 768px (was max-w-2xl 672px)
    lg: 'max-w-5xl',    // 1024px (was max-w-4xl 896px)
    xl: 'max-w-7xl',    // 1280px (was max-w-6xl 1152px)
    full: 'w-full max-w-6xl'
  }
  
  return (
    <div 
      className={`modal-container glass-card ${sizeStyles[size]} w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-500 flex flex-col rounded-[2rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] ${className}`}
      style={{ 
        backgroundColor: tint || 'transparent',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

/* ============= Modal Header ============= */

interface ModalHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  icon?: string
  iconColor?: string
  onClose?: void | (() => void)
  showBackButton?: boolean
  leading?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function ModalHeader({ 
  title, 
  subtitle,
  icon,
  iconColor = 'text-primary',
  onClose,
  showBackButton = true,
  leading,
  actions,
  children,
  className = ''
}: ModalHeaderProps) {
  return (
    <div className={`flex items-center gap-4 p-5 border-b border-white/10 bg-white/5 backdrop-blur-3xl shrink-0 relative ${className}`}>
      {showBackButton && onClose && (
        <button
          type="button"
          onClick={onClose as () => void}
          className="w-10 h-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-white/10 hover:text-white transition-all duration-300 active:scale-95 shadow-lg shrink-0"
          aria-label="Back"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
      )}
      
      {(leading || icon) && (
        <div className="shrink-0">
          {leading || (
            <div className={`w-10 h-10 rounded-full ${iconColor.replace('text-', 'bg-')}/10 border border-white/10 flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-lg ${iconColor}`}>{icon}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-white truncate tracking-tight">{title}</h2>
        {subtitle && <p className="text-neutral-400 text-xs mt-0.5 truncate font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {(actions || children) && (
          <div className="flex items-center gap-2">
            {actions || children}
          </div>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose as () => void}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>
    </div>
  )
}

/* ============= Modal Content ============= */

interface ModalContentProps {
  children: React.ReactNode
  className?: string
  maxHeight?: boolean
}

export function ModalContent({ 
  children, 
  className = '',
  maxHeight = true
}: ModalContentProps) {
  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 bg-white/[0.02] ${maxHeight ? 'max-h-[calc(85vh-100px)]' : ''} ${className}`}>
      {children}
    </div>
  )
}

/* ============= Modal Footer ============= */

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`flex gap-3 p-5 border-t border-white/10 bg-white/5 backdrop-blur-2xl shrink-0 ${className}`}>
      {children}
    </div>
  )
}

/* ============= Full Modal (Combined) ============= */

interface FullModalProps {
  children: React.ReactNode
  isOpen: boolean
  onClose?: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export function FullModal({ 
  children, 
  isOpen, 
  onClose,
  size = 'md',
  className = ''
}: FullModalProps) {
  if (!isOpen) return null
  
  return (
    <ModalBackdrop onClick={onClose}>
      <ModalContainer size={size} className={className}>
        {children}
      </ModalContainer>
    </ModalBackdrop>
  )
}

/* ============= Base Detail Modal (Two-Column Blueprint) ============= */

interface BaseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  icon?: string
  iconColor?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  tint?: string
  actions?: React.ReactNode
  footer?: React.ReactNode
  
  // Two-column layout content
  leftColumn: React.ReactNode
  rightColumn?: React.ReactNode // Usually the Map or Media Preview
  
  // Custom classes
  containerClassName?: string
  leftColumnClassName?: string
  rightColumnClassName?: string
}

export function BaseDetailModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconColor,
  size = 'lg',
  tint,
  actions,
  footer,
  leftColumn,
  rightColumn,
  containerClassName = '',
  leftColumnClassName = '',
  rightColumnClassName = ''
}: BaseDetailModalProps) {
  if (!isOpen) return null

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalContainer 
        size={size} 
        tint={tint} 
        className={`max-h-[85vh] flex flex-col ${containerClassName}`}
      >
        <ModalHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          iconColor={iconColor}
          onClose={onClose}
          actions={actions}
        />

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column - Form/Details */}
          <div className={`flex-1 md:flex-[0.5] overflow-y-auto custom-scrollbar p-4 space-y-4 border-b md:border-b-0 md:border-r border-white/10 ${leftColumnClassName}`}>
            {leftColumn}
          </div>

          {/* Right Column - Map/Preview */}
          <div className={`hidden md:flex md:flex-1 md:flex-[0.5] flex-col ${rightColumnClassName}`}>
            {rightColumn || (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-4 p-6 bg-white/5">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl opacity-20">visibility_off</span>
                </div>
                <p className="text-xs font-bold opacity-30">No Preview Available</p>
              </div>
            )}
          </div>
        </div>

        {footer && (
          <ModalFooter>
            {footer}
          </ModalFooter>
        )}
      </ModalContainer>
    </ModalBackdrop>
  )
}
