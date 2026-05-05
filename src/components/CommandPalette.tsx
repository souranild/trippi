'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Command {
  id: string
  title: string
  subtitle?: string
  icon: string
  shortcut?: string[]
  action: () => void
  category: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: Command[]
}

export default function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) || 
    cmd.category.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action()
        onClose()
      }
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!mounted || !isOpen) return null

  // Group commands by category
  const categories = Array.from(new Set(filteredCommands.map(c => c.category)))

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-xl bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <span className="material-symbols-outlined text-neutral-500">search</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-neutral-600 text-lg"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">ESC</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-neutral-700 mb-2">sentiment_dissatisfied</span>
              <p className="text-neutral-500">No commands found matching "{search}"</p>
            </div>
          ) : (
            categories.map(category => (
              <div key={category} className="mb-4 last:mb-0">
                <div className="px-3 py-2 text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">{category}</div>
                <div className="space-y-1">
                  {filteredCommands.filter(c => c.category === category).map((cmd) => {
                    const globalIndex = filteredCommands.indexOf(cmd)
                    const isSelected = globalIndex === selectedIndex
                    
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action()
                          onClose()
                        }}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group ${
                          isSelected 
                            ? 'bg-primary/20 text-white border border-primary/30' 
                            : 'text-neutral-400 hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-primary text-slate-950' : 'bg-white/5 text-neutral-500 group-hover:text-neutral-300'
                          }`}>
                            <span className="material-symbols-outlined text-xl">{cmd.icon}</span>
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold tracking-wide">{cmd.title}</div>
                            {cmd.subtitle && <div className="text-xs text-neutral-500">{cmd.subtitle}</div>}
                          </div>
                        </div>
                        
                        {cmd.shortcut && (
                          <div className="flex items-center gap-1">
                            {cmd.shortcut.map(key => (
                              <div key={key} className={`flex items-center justify-center min-w-[20px] h-5 px-1 rounded border border-white/10 bg-white/5 text-[10px] font-black transition-colors ${
                                isSelected ? 'text-primary border-primary/30' : 'text-neutral-600'
                              }`}>
                                {key}
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center justify-center w-5 h-5 rounded border border-white/10 bg-white/5">
                <span className="material-symbols-outlined text-[12px] text-neutral-500">arrow_downward</span>
              </span>
              <span className="flex items-center justify-center w-5 h-5 rounded border border-white/10 bg-white/5">
                <span className="material-symbols-outlined text-[12px] text-neutral-500">arrow_upward</span>
              </span>
              <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center justify-center h-5 px-1.5 rounded border border-white/10 bg-white/5 text-[10px] text-neutral-500 font-black">ENTER</span>
              <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">Select</span>
            </div>
          </div>
          <div className="text-[10px] text-neutral-700 font-black tracking-widest uppercase italic">Trippi v1.0 CMD</div>
        </div>
      </div>
    </div>,
    document.body
  )
}
