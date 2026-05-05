'use client'

import { useState, useEffect, useCallback } from 'react'
import { ModalBackdrop } from './ModalLayout'

interface MediaItem {
  url: string
  type: 'image' | 'video' | 'pdf' | 'other'
  day?: number
}

interface MediaViewerProps {
  items: MediaItem[]
  initialIndex: number
  onClose: () => void
}

export default function MediaViewer({ items, initialIndex, onClose }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev))
    if (e.key === 'ArrowRight') setCurrentIndex(prev => (prev < items.length - 1 ? prev + 1 : prev))
  }, [items.length, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const currentItem = items[currentIndex]
  if (!currentItem) return null

  return (
    <ModalBackdrop onClick={onClose} className="z-[8000] bg-black/95 backdrop-blur-2xl p-0 md:p-8 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-4" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-[8010] p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 active:scale-95"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Counter */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-mono tracking-widest z-[8010]">
          {currentIndex + 1} / {items.length}
        </div>

        {/* Content */}
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
          {currentItem.day && (
            <div className="mb-4 px-4 py-1.5 bg-primary/20 backdrop-blur-xl border border-primary/30 rounded-full z-[8010] animate-in slide-in-from-top-2 duration-300">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Day {currentItem.day}</span>
            </div>
          )}

          {currentItem.type === 'video' ? (
            <video 
              src={currentItem.url} 
              controls 
              autoPlay 
              className="max-w-full max-h-full rounded-2xl shadow-2xl border border-white/5"
            />
          ) : currentItem.type === 'pdf' ? (
            <iframe 
              src={currentItem.url} 
              className="w-full h-full max-w-5xl bg-white rounded-2xl shadow-2xl"
            />
          ) : (
            <img 
              src={currentItem.url} 
              alt="" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-all"
            />
          )}
        </div>

        {/* Controls */}
        {items.length > 1 && (
          <>
            <button 
              onClick={() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev))}
              disabled={currentIndex === 0}
              className={`absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 text-white border border-white/10 transition-all active:scale-90 ${currentIndex === 0 ? 'opacity-0 scale-90' : 'hover:bg-white/10 scale-100 opacity-100'}`}
            >
              <span className="material-symbols-outlined text-3xl">chevron_left</span>
            </button>
            <button 
              onClick={() => setCurrentIndex(prev => (prev < items.length - 1 ? prev + 1 : prev))}
              disabled={currentIndex === items.length - 1}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 text-white border border-white/10 transition-all active:scale-90 ${currentIndex === items.length - 1 ? 'opacity-0 scale-90' : 'hover:bg-white/10 scale-100 opacity-100'}`}
            >
              <span className="material-symbols-outlined text-3xl">chevron_right</span>
            </button>
          </>
        )}

        {/* Thumbnails rail */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md max-w-[90vw] overflow-x-auto no-scrollbar">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${i === currentIndex ? 'border-primary ring-4 ring-primary/20 scale-105' : 'border-white/10 opacity-50 hover:opacity-100'}`}
            >
              {item.type === 'video' ? (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/50 text-base">videocam</span>
                </div>
              ) : item.type === 'pdf' ? (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/50 text-base">picture_as_pdf</span>
                </div>
              ) : (
                <img src={item.url} className="w-full h-full object-cover" alt="" />
              )}
            </button>
          ))}
        </div>
      </div>
    </ModalBackdrop>
  )
}
