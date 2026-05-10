'use client'

import React from 'react'
import { DiscoveryResult, getIconForType, formatDistance, enrichDiscoveryResult } from '@/lib/discovery'
import { BaseDetailModal } from '@/components/ModalLayout'
import { Button } from '@/components/Button'
import { FormLabel } from '@/components/FormLayout'
import dynamic from 'next/dynamic'

const MapPreview = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div className="h-48 bg-neutral-800/50 rounded-xl flex items-center justify-center text-neutral-500">Loading map...</div>
})

interface DiscoveryDetailModalProps {
  discovery: DiscoveryResult | null
  isOpen: boolean
  onClose: () => void
  onAdd: (discovery: DiscoveryResult) => void
  mapStyle?: string
}

export default function DiscoveryDetailModal({
  discovery: initialDiscovery,
  isOpen,
  onClose,
  onAdd,
  mapStyle
}: DiscoveryDetailModalProps) {
  const [discovery, setDiscovery] = React.useState<DiscoveryResult | null>(initialDiscovery)
  const [isEnriching, setIsEnriching] = React.useState(false)

  React.useEffect(() => {
    setDiscovery(initialDiscovery)
  }, [initialDiscovery])

  React.useEffect(() => {
    if (isOpen && discovery && !discovery.description && !discovery.images?.length) {
      const enrich = async () => {
        setIsEnriching(true)
        try {
          const enriched = await enrichDiscoveryResult(discovery)
          setDiscovery(enriched)
        } catch (e) {
          console.error('Failed to enrich discovery', e)
        } finally {
          setIsEnriching(false)
        }
      }
      enrich()
    }
  }, [isOpen, discovery?.id])

  if (!discovery) return null

  const type = discovery.type || 'landmark'
  const icon = getIconForType(type)
  
  // Format the type label
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')

  const leftColumn = (
    <div className="space-y-6 min-h-[400px] flex flex-col">
      {/* 1. About Section */}
      {discovery.description ? (
        <div className="space-y-4 pb-6 border-b border-white/10">
          <FormLabel variant="primary" className="!mb-0 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">description</span> 
            <span className="text-[12px] font-bold text-neutral-300">About this place</span>
          </FormLabel>
          <div className="overflow-hidden rounded-xl border border-white/5 bg-white/5 p-5">
            <p className="text-sm leading-relaxed text-neutral-300 font-medium">
              {discovery.description}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pb-6 border-b border-white/10 opacity-40">
           <FormLabel variant="primary" className="!mb-0 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">description</span> 
            <span className="text-[12px] font-bold text-neutral-300">About</span>
          </FormLabel>
          <p className="text-[10px] uppercase tracking-widest font-bold px-1">No description found</p>
        </div>
      )}

      {/* 2. Details Section */}
      {(discovery.tags?.['addr:full'] || discovery.tags?.website || discovery.tags?.phone) && (
        <div className="space-y-4 pb-6 border-b border-white/10">
          <FormLabel variant="primary" className="!mb-0 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">info</span> 
            <span className="text-[12px] font-bold text-neutral-300">Details & Contact</span>
          </FormLabel>
          <div className="grid grid-cols-2 gap-4">
            {discovery.tags?.['addr:full'] && (
              <div className="col-span-2 overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">Address</span>
                <span className="text-xs font-bold text-white/80">{discovery.tags['addr:full']}</span>
              </div>
            )}
            {discovery.tags?.website && (
              <a href={discovery.tags.website} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 flex flex-col gap-1.5 hover:bg-white/10 transition-all group">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">Website</span>
                <span className="text-xs font-bold text-blue-400">Visit Site</span>
              </a>
            )}
            {discovery.tags?.phone && (
              <div className="overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">Phone</span>
                <span className="text-xs font-bold text-white/80">{discovery.tags.phone}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Media Section */}
      <div className="space-y-4 mt-auto">
        <FormLabel variant="primary" className="!mb-0 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">image</span> 
          <span className="text-[12px] font-bold text-neutral-300">Media & Gallery</span>
        </FormLabel>
        {discovery.images && discovery.images.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {discovery.images.slice(0, 6).map((img, i) => (
              <div key={i} className={`relative aspect-square rounded-[1.5rem] overflow-hidden border border-white/5 bg-white/5 group/media cursor-pointer ${i === 0 ? 'col-span-2 row-span-2 aspect-video' : ''}`}>
                <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110" alt="" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                   <span className="material-symbols-outlined text-white text-2xl scale-75 group-hover/media:scale-100 transition-transform">zoom_in</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-24 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center text-neutral-700">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">No Media Available</span>
          </div>
        )}
      </div>
    </div>
  )

  const rightColumn = (
    <div className="h-full rounded-[2rem] overflow-hidden border border-white/10 bg-neutral-900 shadow-2xl relative">
      <MapPreview
        places={[{
          id: discovery.id,
          name: discovery.name,
          lat: discovery.lat,
          lng: discovery.lng,
          type: discovery.type,
          tripId: 'discovery-preview'
        } as any]}
        focusedPlaceId={discovery.id}
        showDayNumbers={false}
        showControls={true}
        className="h-full w-full"
        mapStyle={mapStyle}
      />
    </div>
  )

  return (
    <BaseDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={discovery.name}
      subtitle={discovery.distance !== undefined ? `${typeLabel} • ${formatDistance(discovery.distance)} away` : `${typeLabel} • Discovery Suggestion`}
      icon={icon}
      iconColor="text-primary"
      leftColumn={leftColumn}
      rightColumn={rightColumn}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Interested?</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>Maybe Later</Button>
            <Button 
              variant="primary" 
              onClick={() => {
                onAdd(discovery)
                onClose()
              }}
              className="px-8"
            >
              Add to Trip
            </Button>
          </div>
        </div>
      }
    />
  )
}
