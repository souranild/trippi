'use client'

import { useState } from 'react'
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '@/components/ModalLayout'

const avatars = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face'
]

interface ProfilePickerProps {
  currentAvatar: string
  onSelect: (avatar: string) => void
  onClose: () => void
}

export default function ProfilePicker({ currentAvatar, onSelect, onClose }: ProfilePickerProps) {
  const [selected, setSelected] = useState(currentAvatar)

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalContainer size="sm" tint="rgba(34, 211, 238, 0.05)">
        <ModalHeader 
          title="Choose Avatar" 
          onClose={onClose} 
          showBackButton={true}
          leading={
            <div className="w-10 h-10 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg text-cyan-400">person</span>
            </div>
          }
        />
        <ModalContent>
          <div className="grid grid-cols-4 gap-4">
            {avatars.map((avatar, index) => (
              <button
                key={index}
                onClick={() => setSelected(avatar)}
                className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all p-0.5 ${
                  selected === avatar
                    ? 'border-cyan-400 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <img
                  src={avatar}
                  alt={`Avatar ${index + 1}`}
                  className="w-full h-full object-cover rounded-full"
                />
                {selected === avatar && (
                  <div className="absolute inset-0 bg-cyan-400/10 rounded-full flex items-center justify-center">
                     <span className="material-symbols-outlined text-cyan-400 text-sm">check</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </ModalContent>
        <ModalFooter>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl border border-white/10 text-white font-bold text-xs hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(selected)}
            className="flex-[2] py-3 px-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all active:scale-95"
          >
            Save Profile
          </button>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>
  )
}