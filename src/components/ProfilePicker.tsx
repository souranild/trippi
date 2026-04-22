'use client'

import { useState } from 'react'

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
  return (
    <div className="modal-backdrop p-4 md:p-8">
      <div className="modal-container max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading-3 text-white">Choose Avatar</h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:bg-neutral-800/50 transition-colors rounded-full"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {avatars.map((avatar, index) => (
            <button
              key={index}
              onClick={() => onSelect(avatar)}
              className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${
                currentAvatar === avatar
                  ? 'border-primary scale-110'
                  : 'border-neutral-600 hover:border-primary/50'
              }`}
            >
              <img
                src={avatar}
                alt={`Avatar ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-neutral-400 hover:bg-neutral-800/50 transition-colors rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(currentAvatar)}
            className="flex-1 bg-primary text-black px-4 py-2 rounded-lg font-bold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}