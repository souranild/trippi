'use client'

import React from 'react'
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from './ModalLayout'
import { Button } from './Button'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'primary'
  icon?: string
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  icon = 'delete_forever'
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: 'text-red-400',
          buttonVariant: 'modal-danger' as const,
          tint: 'rgba(239, 68, 68, 0.05)'
        }
      case 'warning':
        return {
          iconColor: 'text-amber-400',
          buttonVariant: 'modal-primary' as const,
          tint: 'rgba(251, 191, 36, 0.05)'
        }
      default:
        return {
          iconColor: 'text-primary',
          buttonVariant: 'modal-primary' as const,
          tint: 'rgba(var(--glass-tint-rgb), 0.05)'
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <ModalBackdrop onClick={onCancel} className="!z-[9999]">
      <ModalContainer size="sm" tint={styles.tint} className="shadow-2xl">
        <ModalHeader 
          title={title} 
          icon={icon}
          iconColor={styles.iconColor}
          onClose={onCancel}
          showBackButton={false}
        />
        <ModalContent className="py-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className={`w-16 h-16 rounded-[1.5rem] ${styles.iconColor.replace('text-', 'bg-')}/10 border border-white/10 flex items-center justify-center mb-2`}>
              <span className={`material-symbols-outlined text-4xl ${styles.iconColor}`}>{icon}</span>
            </div>
            <p className="text-neutral-300 text-base leading-relaxed">
              {message}
            </p>
          </div>
        </ModalContent>
        <ModalFooter className="flex-col sm:flex-row">
          <Button
            variant="ghost"
            fullWidth
            onClick={onCancel}
            className="sm:flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={styles.buttonVariant}
            fullWidth
            onClick={() => {
              onConfirm()
              onCancel()
            }}
            className="sm:flex-[1.5]"
            autoFocus
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>
  )
}
