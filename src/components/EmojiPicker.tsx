'use client'

import { useState, useMemo } from 'react'
import { EMOJI_CATEGORIES, SKIN_TONES, applySkinTone, supportsSkinTone } from '@/lib/emoji-categories'
import EmojiAvatar from './EmojiAvatar'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  selectedEmoji?: string
  selectedSkinTone: string
  onSkinToneChange: (tone: string) => void
}

export default function EmojiPicker({ onSelect, onClose, selectedEmoji, selectedSkinTone, onSkinToneChange }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].name)

  const categoryEmojis = useMemo(() => {
    const category = EMOJI_CATEGORIES.find(c => c.name === activeCategory)
    return category ? category.emojis : []
  }, [activeCategory])

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Search/Header */}
      <div className="p-4 border-b border-white/5 bg-white/2 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">face</span>
          Select Icon
        </h3>
        <button 
          onClick={onClose}
          className="p-2 text-neutral-500 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Categories */}
      <div className="px-4 py-3 border-b border-white/5 bg-slate-900/50 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 touch-pan-x">
        {EMOJI_CATEGORIES.map(cat => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            className={`p-2 rounded-xl text-xl transition-all flex-shrink-0 ${activeCategory === cat.name ? 'bg-cyan-400/10 text-cyan-400 shadow-sm ring-1 ring-cyan-400/20' : 'hover:bg-white/5 text-neutral-500 hover:text-neutral-300'}`}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2 custom-scrollbar touch-pan-y">
        {categoryEmojis.map((emoji, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(emoji)}
            className={`aspect-square flex items-center justify-center rounded-xl transition-all duration-200 ${
              selectedEmoji === emoji 
                ? 'ring-2 ring-cyan-400 bg-cyan-400/5 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                : 'bg-white/5 hover:bg-white/10 hover:scale-110 active:scale-95'
            }`}
          >
            <EmojiAvatar 
              emoji={emoji} 
              skinTone={selectedSkinTone} 
              size="md" 
              className="bg-transparent shadow-none"
            />
          </button>
        ))}
      </div>

      {/* Style/Skin Tone Footer */}
      {supportsSkinTone(selectedEmoji || '') && (
        <div className="p-4 bg-white/5 border-t border-white/5 animate-in slide-in-from-bottom-2 duration-300">
          <p className="text-xs font-bold text-neutral-500 mb-3 text-center">Style Modifier</p>
          <div className="flex justify-center gap-3">
            {SKIN_TONES.map(tone => (
              <button
                key={tone.code}
                onClick={() => onSkinToneChange(tone.code)}
                className={`w-7 h-7 rounded-full border-2 transition-all duration-200 ${
                  selectedSkinTone === tone.code ? 'border-cyan-400 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'border-transparent hover:scale-110'
                }`}
                style={{ 
                  background: 
                    tone.code === 'original' ? '#ffcc22' :
                    tone.modifier === '🏻' ? '#fce1d4' : 
                    tone.modifier === '🏼' ? '#f3c9b1' : 
                    tone.modifier === '🏽' ? '#d4a181' : 
                    tone.modifier === '🏾' ? '#9f6a4a' : 
                    '#573e31' 
                }}
                title={tone.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
