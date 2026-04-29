'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { DateTimeSelector } from '@/components/DateTimeSelector'
import { ModalBackdrop, ModalContainer, ModalHeader, ModalFooter, BaseDetailModal } from '@/components/ModalLayout'
import LocationPickerModal from '@/components/LocationPickerModal'
import MediaViewer from '@/components/MediaViewer'
import type { Event as TripEvent, Document, Link, Accommodation } from '@/lib/storage'
import { searchWallpapers } from '@/lib/wallpaper-search'
import { getDayWithDate } from '@/lib/date-utils'
import { Button } from '@/components/Button'
import { ConfirmationModal } from './ConfirmationModal'
import { FormInput, FormSelect, FormTextarea, FormGrid, FormLabel } from '@/components/FormLayout'
import Map from '@/components/Map'
import { MediaGrid } from '@/components/MediaGrid'

// ─── Utilities ───────────────────────────────────────────────────────────────
function getMediaType(url: string | { src: { medium: string, large: string } }): 'image' | 'video' {
  if (typeof url !== 'string') return 'image'
  const low = url.toLowerCase()
  if (low.includes('video') || low.match(/\.(mp4|webm|ogg|mov)$/i) || low.startsWith('data:video')) return 'video'
  return 'image'
}

function normalizeUrl(url: string | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `https://${url}`
}

// ─── Attachment union ─────────────────────────────────────────────────────────
export type AttachmentDetailType = 'note' | 'event' | 'document' | 'link' | 'accommodation'

export interface AttachmentDetailData {
  type: AttachmentDetailType
  note?: string
  event?: TripEvent
  document?: Document
  link?: Link
  accommodation?: Accommodation
}

interface Props {
  data: AttachmentDetailData
  isEditMode?: boolean
  placeName?: string
  placeCoords?: { lat: number; lng: number }
  placeStartDay?: number
  placeEndDay?: number
  tripStartDate?: string
  tripEndDate?: string
  totalDays?: number
  mapStyle?: string
  allPlaces?: any[]
  onClose: () => void
  onSave?: (updated: AttachmentDetailData) => void
  onDelete?: () => void
}

// ─── Config per type ──────────────────────────────────────────────────────────
const CFG = {
  note:          { icon: 'sticky_note_2', color: 'text-amber-400', border: 'border-amber-400/30', bg: 'bg-amber-400/10', emoji: '📝', label: 'Note' },
  event:         { icon: 'flag',        color: 'text-red-400',    border: 'border-red-400/30',    bg: 'bg-red-400/10', emoji: '🚩', label: 'Activity' },
  document:      { icon: 'description', color: 'text-blue-400',   border: 'border-blue-400/30',   bg: 'bg-blue-400/10', emoji: '📄', label: 'Document' },
  link:          { icon: 'link',        color: 'text-cyan-400',   border: 'border-cyan-400/30',   bg: 'bg-cyan-400/10', emoji: '🔗', label: 'Link' },
  accommodation: { icon: 'bed',         color: 'text-yellow-400', border: 'border-yellow-400/30', bg: 'bg-yellow-400/10', emoji: '🏨', label: 'Accommodation' },
}

// ─── Shared Components ───────────────────────────────────────────────────────


export default function AttachmentDetailModal({
  data,
  isEditMode: initialEditMode = false,
  placeName,
  placeCoords,
  placeStartDay = 1,
  placeEndDay = 1,
  tripStartDate = '',
  tripEndDate = '',
  totalDays = 1,
  mapStyle,
  allPlaces = [],
  onClose,
  onSave,
  onDelete
}: Props) {
  // --- 1. State ---
  const [isEditMode, setIsEditMode] = useState(initialEditMode)
  const [draft, setDraft] = useState<AttachmentDetailData>(() => JSON.parse(JSON.stringify(data)))
  const [mediaViewer, setMediaViewer] = useState<{ items: string[], index: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [isSearchingModalOpen, setIsSearchingModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // --- 2. Derived State ---
  const dayOptions = useMemo(() => Array.from(
    { length: totalDays || (placeEndDay - placeStartDay + 1) },
    (_, i) => {
      const d = totalDays ? i + 1 : placeStartDay + i
      return { value: d, label: getDayWithDate(tripStartDate, d) }
    }
  ), [totalDays, placeStartDay, placeEndDay, tripStartDate])

  const cfg = CFG[data.type]
  const title = isEditMode ? `Edit ${cfg.label}` : `${cfg.label} Details`
  const subtitle = placeName ? `For ${placeName}` : undefined

  // --- 3. Handlers ---
  const handleSave = () => {
    onSave?.(draft)
    onClose()
  }

  const handleSearch = async (q: string) => {
    if (!q.trim()) return
    setIsSearching(true)
    try {
      const results = await searchWallpapers(q)
      setSearchResults(results)
    } catch (e) { console.error(e) }
    finally { setIsSearching(false) }
  }

  // --- 4. Column Content ---
  const leftColumnContent = (
    <div className="space-y-5">
      {/* Note Section */}
      {draft.type === 'note' && (
        <div className="space-y-4">
          {isEditMode ? (
            <FormTextarea
              label="Note Content"
              labelVariant="primary"
              className="h-64"
              value={draft.note || ''}
              onChange={e => setDraft({ ...draft, note: e.target.value })}
              autoFocus
            />
          ) : (
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <p className="text-neutral-200 text-sm leading-relaxed whitespace-pre-wrap">{draft.note || 'No content'}</p>
            </div>
          )}
        </div>
      )}

      {/* Event Section */}
      {draft.type === 'event' && draft.event && (
        <div className="space-y-4">
          <FormInput
            label="Event Title"
            labelVariant="primary"
            disabled={!isEditMode}
            value={draft.event.title}
            onChange={e => setDraft({ ...draft, event: { ...draft.event!, title: e.target.value } })}
          />
          
          {/* Location Section */}
          <div className="space-y-2 pb-1">
            <FormLabel variant="primary" className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">location_on</span> Location
            </FormLabel>
            <div className="relative group">
              <div 
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm transition-all flex items-center justify-between ${isEditMode ? 'hover:bg-white/10 cursor-pointer' : ''}`} 
                onClick={() => isEditMode && setIsLocationPickerOpen(true)}
              >
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-neutral-400 text-xs truncate leading-tight mb-0.5">{draft.event.location || "No address set"}</p>
                </div>
                {isEditMode && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary/20 text-primary rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <span className="material-symbols-outlined text-sm">edit_location</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <FormLabel variant="primary" className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">photo_library</span> Media
            </FormLabel>
            <MediaGrid 
              photos={draft.event.photos || []} 
              editing={isEditMode} 
              onMediaClick={(idx) => setMediaViewer({ items: draft.event!.photos!, index: idx })}
              onRemove={(idx) => setDraft({ ...draft, event: { ...draft.event!, photos: draft.event!.photos!.filter((_, i) => i !== idx) } })}
              onAdd={() => setIsSearchingModalOpen(true)}
              aspectRatio="square"
            />
          </div>

          <DateTimeSelector
            label="Schedule"
            icon="schedule"
            dayValue={draft.event.day || placeStartDay}
            timeValue={draft.event.time || ''}
            dayOptions={dayOptions}
            onDayChange={d => setDraft({ ...draft, event: { ...draft.event!, day: d } })}
            onTimeChange={t => setDraft({ ...draft, event: { ...draft.event!, time: t } })}
            disabled={!isEditMode}
          />

          <FormTextarea
            label="Description"
            labelVariant="primary"
            disabled={!isEditMode}
            value={draft.event.description || ''}
            onChange={e => setDraft({ ...draft, event: { ...draft.event!, description: e.target.value } })}
            className="h-24"
          />
        </div>
      )}

      {/* Document Section */}
      {draft.type === 'document' && draft.document && (
        <div className="space-y-4">
          <FormInput
            label="Document Name"
            labelVariant="primary"
            disabled={!isEditMode}
            value={draft.document.name}
            onChange={e => setDraft({ ...draft, document: { ...draft.document!, name: e.target.value } })}
          />
          <FormInput
            label="URL (Optional)"
            labelVariant="primary"
            disabled={!isEditMode}
            value={draft.document.url || ''}
            onChange={e => setDraft({ ...draft, document: { ...draft.document!, url: e.target.value } })}
          />
          {!isEditMode && draft.document.url && (
            <a href={normalizeUrl(draft.document.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-xs">
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Open Document
            </a>
          )}
        </div>
      )}

      {/* Link Section */}
      {draft.type === 'link' && draft.link && (
        <div className="space-y-4">
          <FormInput
            label="Label"
            labelVariant="primary"
            disabled={!isEditMode}
            value={draft.link.title}
            onChange={e => setDraft({ ...draft, link: { ...draft.link!, title: e.target.value } })}
          />
          <FormInput
            label="URL"
            labelVariant="primary"
            disabled={!isEditMode}
            value={draft.link.url}
            onChange={e => setDraft({ ...draft, link: { ...draft.link!, url: e.target.value } })}
          />
          {!isEditMode && (
            <a href={normalizeUrl(draft.link.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-xs">
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Visit Website
            </a>
          )}
        </div>
      )}

      {/* Accommodation Section */}
      {draft.type === 'accommodation' && draft.accommodation && (
        <div className="space-y-5">
          <FormGrid columns={2}>
            <FormInput
              label="Name"
              labelVariant="primary"
              disabled={!isEditMode}
              value={draft.accommodation.name}
              onChange={e => setDraft({ ...draft, accommodation: { ...draft.accommodation!, name: e.target.value } })}
            />
            <FormSelect
              label="Type"
              labelVariant="primary"
              disabled={!isEditMode}
              value={draft.accommodation.type}
              options={[
                { value: 'Hotel', label: 'Hotel' },
                { value: 'Airbnb', label: 'Airbnb' },
                { value: 'Hostel', label: 'Hostel' },
                { value: 'Other', label: 'Other' },
              ]}
              onChange={e => setDraft({ ...draft, accommodation: { ...draft.accommodation!, type: e.target.value } })}
            />
          </FormGrid>
          
          {/* Location Section */}
          <div className="space-y-2 pb-1 border-b border-white/10">
            <FormLabel variant="primary" className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">location_on</span> Location
            </FormLabel>
            <div className="relative group">
              <div 
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm transition-all flex items-center justify-between ${isEditMode ? 'hover:bg-white/10 cursor-pointer' : ''}`} 
                onClick={() => isEditMode && setIsLocationPickerOpen(true)}
              >
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-neutral-400 text-xs truncate leading-tight mb-0.5">{draft.accommodation.address || "No address set"}</p>
                </div>
                {isEditMode && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary/20 text-primary rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <span className="material-symbols-outlined text-sm">edit_location</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <FormLabel variant="primary" className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">photo_library</span> Media
            </FormLabel>
            <MediaGrid 
              photos={draft.accommodation.photos || []} 
              editing={isEditMode} 
              onMediaClick={(idx) => setMediaViewer({ items: draft.accommodation!.photos!, index: idx })}
              onRemove={(idx) => setDraft({ ...draft, accommodation: { ...draft.accommodation!, photos: draft.accommodation!.photos!.filter((_, i) => i !== idx) } })}
              onAdd={() => setIsSearchingModalOpen(true)}
              aspectRatio="square"
            />
          </div>

          <FormTextarea
            label="Description"
            labelVariant="primary"
            disabled={!isEditMode}
            value={draft.accommodation.description || ''}
            onChange={e => setDraft({ ...draft, accommodation: { ...draft.accommodation!, description: e.target.value } })}
            className="h-24"
          />

          <div className="space-y-4 pt-2">
            <FormLabel variant="primary" className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">schedule</span> Timing
            </FormLabel>
            <div className="space-y-4">
              <DateTimeSelector
                label="Check-in"
                icon="login"
                dayValue={draft.accommodation.checkInDay || placeStartDay}
                timeValue={draft.accommodation.checkIn || ''}
                dayOptions={dayOptions}
                onDayChange={d => setDraft({ ...draft, accommodation: { ...draft.accommodation!, checkInDay: d } })}
                onTimeChange={t => setDraft({ ...draft, accommodation: { ...draft.accommodation!, checkIn: t } })}
                disabled={!isEditMode}
              />
              <DateTimeSelector
                label="Check-out"
                icon="logout"
                dayValue={draft.accommodation.checkOutDay || placeStartDay}
                timeValue={draft.accommodation.checkOut || ''}
                dayOptions={dayOptions}
                onDayChange={d => setDraft({ ...draft, accommodation: { ...draft.accommodation!, checkOutDay: d } })}
                onTimeChange={t => setDraft({ ...draft, accommodation: { ...draft.accommodation!, checkOut: t } })}
                disabled={!isEditMode}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const rightColumnContent = (
    <div className="h-full bg-neutral-900 relative">
      {(draft.type === 'accommodation' || draft.type === 'event') ? (
        <Map
          className="w-full h-full"
          places={[
            ...allPlaces.filter(p => (p.lat !== draft.accommodation?.lat || p.lng !== draft.accommodation?.lng) && (p.lat !== draft.event?.lat || p.lng !== draft.event?.lng)),
            // Attachment Marker
            {
              id: 'preview',
              name: draft.type === 'accommodation' ? draft.accommodation?.name : draft.event?.title,
              location: draft.type === 'accommodation' ? draft.accommodation?.address || '' : draft.event?.location || '',
              lat: draft.type === 'accommodation' ? draft.accommodation?.lat : draft.event?.lat,
              lng: draft.type === 'accommodation' ? draft.accommodation?.lng : draft.event?.lng,
              emoji: cfg.emoji
            }
          ].filter(p => p.lat !== undefined && p.lng !== undefined) as any[]}
          focusedPlaceId="preview"
          showDayNumbers={false}
          showControls={true}
          mapStyle={mapStyle}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-4 h-full">
          <div className={`w-20 h-20 rounded-full ${cfg.color.replace('text-', 'bg-')}/10 border border-white/10 flex items-center justify-center`}>
            <span className={`material-symbols-outlined text-4xl ${cfg.color} opacity-40`}>{cfg.icon}</span>
          </div>
          <p className="text-xs font-bold opacity-30">No Map Preview Available</p>
        </div>
      )}
    </div>
  )

  return (
    <>
      <BaseDetailModal
        isOpen={true}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        icon={cfg.icon}
        iconColor={cfg.color}
        leftColumn={leftColumnContent}
        rightColumn={rightColumnContent}
        footer={
          <div className="flex items-center justify-between w-full">
            {onDelete && (
              <Button
                variant="modal-danger"
                icon="delete"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              {isEditMode ? (
                <React.Fragment key="edit-mode-actions">
                  <Button variant="modal-secondary" onClick={() => setIsEditMode(false)}>Cancel</Button>
                  <Button variant="modal-primary" icon="save" onClick={handleSave}>Save Changes</Button>
                </React.Fragment>
              ) : (
                <React.Fragment key="view-mode-actions">
                  <Button variant="modal-secondary" icon="edit" onClick={() => setIsEditMode(true)}>Edit Details</Button>
                  <Button variant="modal-primary" onClick={onClose}>Close</Button>
                </React.Fragment>
              )}
            </div>
          </div>
        }
      />

      {mediaViewer && (
        <MediaViewer
          items={mediaViewer.items.map(url => ({ url, type: getMediaType(url) }))}
          initialIndex={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
        />
      )}

      {isLocationPickerOpen && (
        <LocationPickerModal
          isOpen={true}
          onClose={() => setIsLocationPickerOpen(false)}
          mapStyle={mapStyle}
          onSelect={(loc) => {
            if (draft.type === 'accommodation') {
              setDraft({ ...draft, accommodation: { ...draft.accommodation!, name: loc.name, address: loc.address, lat: loc.lat, lng: loc.lng } })
            } else if (draft.type === 'event') {
              setDraft({ ...draft, event: { ...draft.event!, location: loc.address, lat: loc.lat, lng: loc.lng } })
            }
            setIsLocationPickerOpen(false)
          }}
        />
      )}

      {isSearchingModalOpen && (
        <ModalBackdrop onClick={() => setIsSearchingModalOpen(false)}>
          <ModalContainer size="lg">
            <ModalHeader 
              title="Search Photos" 
              subtitle={`Finding images for ${draft.type === 'accommodation' ? draft.accommodation?.name : draft.event?.title}`}
              onClose={() => setIsSearchingModalOpen(false)}
            />
            <div className="p-6 border-b border-white/10">
              <div className="relative">
                <input
                  autoFocus
                  placeholder="Search for photos..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white outline-none focus:border-primary transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery)}
                />
                <button onClick={() => handleSearch(searchQuery)} className="absolute right-3 top-3 text-white/40 hover:text-white">
                  <span className="material-symbols-outlined">{isSearching ? 'refresh' : 'search'}</span>
                </button>
              </div>
            </div>
            <ModalContent>
              {isSearching ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {searchResults.map((photo: string, i: number) => {
                    const currentPhotos = draft.type === 'accommodation' ? (draft.accommodation?.photos || []) : (draft.event?.photos || [])
                    const isSelected = currentPhotos.includes(photo)
                    return (
                      <div 
                        key={`search-result-${i}`} 
                        className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer transition-all border ${
                          isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-white/10 hover:scale-105'
                        }`}
                        onClick={() => {
                          let newPhotos = isSelected 
                            ? currentPhotos.filter(p => p !== photo)
                            : [...currentPhotos, photo]
                          
                          if (draft.type === 'accommodation') {
                            setDraft({ ...draft, accommodation: { ...draft.accommodation!, photos: newPhotos } })
                          } else if (draft.type === 'event') {
                            setDraft({ ...draft, event: { ...draft.event!, photos: newPhotos } })
                          }
                        }}
                      >
                        <img src={photo} className="w-full h-full object-cover" alt="" />
                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
                          <span className="material-symbols-outlined text-white text-3xl">
                            {isSelected ? 'check_circle' : 'add_circle'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ModalContent>
            <ModalFooter>
              <Button variant="modal-primary" fullWidth onClick={() => setIsSearchingModalOpen(false)}>Done</Button>
            </ModalFooter>
          </ModalContainer>
        </ModalBackdrop>
      )}

      {showDeleteConfirm && (
        <ConfirmationModal
          isOpen={true}
          title={`Delete ${cfg.label}`}
          message={`Are you sure you want to remove this ${cfg.label}? This action cannot be undone.`}
          onConfirm={() => {
            onDelete?.()
            setShowDeleteConfirm(false)
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}
