'use client'

import React, { useEffect } from 'react'
import { useMapContext } from '@/context/MapContext'
import MapSlot from './MapSlot'

export default function ExpandedMapModal() {
  const { isExpanded, setIsExpanded, mapState } = useMapContext()

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isExpanded])

  if (!isExpanded || !mapState) return null

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-black/40 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-10 duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] no-print">
      <div className="absolute inset-0 z-[-1] bg-black/60" />
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-neutral-900/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
             <span className="material-symbols-outlined text-primary text-xl">map</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-headline">Map Workspace</h2>
            <p className="text-neutral-400 text-xs mt-0.5">Focus mode for exploration</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsExpanded(false)}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all active:scale-90"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative overflow-hidden">
        <MapSlot 
          {...mapState}
          className="w-full h-full"
          showControls={true}
          isModal={true}
        />
      </div>
    </div>
  )
}
