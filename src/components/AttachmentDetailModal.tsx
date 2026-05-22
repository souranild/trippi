'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { DateTimeSelector } from '@/components/DateTimeSelector'
import RichTextEditor from './RichTextEditor'
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter, BaseDetailModal } from '@/components/ModalLayout'
import LocationPickerModal from '@/components/LocationPickerModal'
import MediaViewer from '@/components/MediaViewer'
import type { Event as TripEvent, Document, Link, Accommodation } from '@/lib/storage'
import { searchWallpapers } from '@/lib/wallpaper-search'
import { getDayWithDate } from '@/lib/date-utils'
import { Button } from '@/components/Button'
import { ConfirmationModal } from './ConfirmationModal'
import { fetchLocationInfo } from '@/lib/image-utils'
import { FormInput, FormSelect, FormTextarea, FormGrid, FormLabel, FormInputGroup } from '@/components/FormLayout'
import { getBoundsError } from '@/lib/itinerary-utils'
import { getOnlineDocumentDetails, getDocumentIconAndBadge } from '@/lib/document-utils'

import Map from '@/components/Map'
import { MediaGrid } from '@/components/MediaGrid'
import { toggleHtmlCheckbox } from '@/lib/rich-text-utils'

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
  placeId?: string
  placeName?: string
  placeCoords?: { lat: number; lng: number }
  placeStartDay?: number
  placeEndDay?: number
  tripStartDate?: string
  tripEndDate?: string
  totalDays?: number
  mapStyle?: string
  allPlaces?: any[]
  placeArrivalTime?: string
  placeDepartureTime?: string
  onClose: () => void
  onSave?: (updated: AttachmentDetailData) => void
  onDelete?: () => void
  timeFormat?: '12h' | '24h'
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
  placeId,
  placeName,
  placeCoords,
  placeStartDay = 1,
  placeEndDay = 1,
  tripStartDate = '',
  tripEndDate = '',
  totalDays,
  mapStyle,
  allPlaces = [],
  placeArrivalTime,
  placeDepartureTime,
  onClose,
  onSave,
  onDelete,
  timeFormat = '12h'
}: Props) {
  // --- 1. State ---
  const [isEditMode, setIsEditMode] = useState(initialEditMode)
  const [draft, setDraft] = useState<AttachmentDetailData>(() => JSON.parse(JSON.stringify(data)))
  const [mediaViewer, setMediaViewer] = useState<{ items: any[], index: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [isSearchingModalOpen, setIsSearchingModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isFetchingInfo, setIsFetchingInfo] = useState(false)

  const handleMagicFetch = async () => {
    const name = draft.type === 'accommodation' ? draft.accommodation?.name : draft.event?.title
    if (!name || name.length < 3) return

    setIsFetchingInfo(true)
    try {
      const info = await fetchLocationInfo(name)
      if (info) {
        if (draft.type === 'accommodation' && draft.accommodation) {
          setDraft({
            ...draft,
            accommodation: {
              ...draft.accommodation,
              address: info.address || draft.accommodation.address,
              lat: info.lat || draft.accommodation.lat,
              lng: info.lng || draft.accommodation.lng,
              photos: [...(draft.accommodation.photos || []), ...info.images.filter(img => !draft.accommodation!.photos?.includes(img))],
              description: info.description || draft.accommodation.description
            }
          })
        } else if (draft.type === 'event' && draft.event) {
          setDraft({
            ...draft,
            event: {
              ...draft.event,
              location: info.address || draft.event.location,
              lat: info.lat || draft.event.lat,
              lng: info.lng || draft.event.lng,
              photos: [...(draft.event.photos || []), ...info.images.filter(img => !draft.event!.photos?.includes(img))],
              description: info.description || draft.event.description
            }
          })
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsFetchingInfo(false)
    }
  }

  // --- 2. Derived State ---
  const dayOptions = useMemo(() => {
    const options = []
    const hasTripDayRange = typeof totalDays === 'number' && totalDays > 0
    const length = hasTripDayRange ? totalDays : (placeEndDay - placeStartDay + 1)
    
    // Add 3 days before
    for (let i = -2; i <= 0; i++) {
      options.push({
        value: i,
        label: getDayWithDate(tripStartDate, i)
      })
    }
    
    // Standard days
    for (let i = 0; i < length; i++) {
      const d = hasTripDayRange ? i + 1 : placeStartDay + i
      options.push({ value: d, label: getDayWithDate(tripStartDate, d) })
    }
    
    // Add 3 days after
    const lastDay = hasTripDayRange ? totalDays : placeEndDay
    for (let i = lastDay + 1; i <= lastDay + 3; i++) {
      options.push({
        value: i,
        label: getDayWithDate(tripStartDate, i)
      })
    }
    
    return options
  }, [totalDays, placeStartDay, placeEndDay, tripStartDate])

  const cfg = CFG[data.type]
  const title = isEditMode ? `Edit ${cfg.label}` : `${cfg.label} Details`
  const subtitle = placeName ? `For ${placeName}` : undefined

  const normalizeDayValue = (day?: number): number | undefined => {
    if (day == null) return undefined
    const n = Number(day)
    if (!Number.isFinite(n)) return undefined

    const span = Math.max(1, placeEndDay - placeStartDay + 1)
    // Legacy data may store attachment days relative to place start (1..span).
    if (n < placeStartDay && n >= 1 && n <= span) {
      return placeStartDay + n - 1
    }
    return n
  }

  // --- 3. Handlers ---
  const isValid = () => {
    if (draft.type === 'document') {
      return (draft.document?.name?.trim().length || 0) > 0 && 
             ((draft.document?.url?.trim().length || 0) > 0 || draft.document?.file != null)
    }
    if (draft.type === 'event') return (draft.event?.title?.trim().length || 0) > 0
    if (draft.type === 'link') return (draft.link?.url?.trim().length || 0) > 0
    if (draft.type === 'accommodation') return (draft.accommodation?.name?.trim().length || 0) > 0
    if (draft.type === 'note') return (draft.note?.trim().length || 0) > 0
    return true
  }

  const handleSave = () => {
    if (draft.type === 'event' && draft.event) {
      const normalizedStart = normalizeDayValue(draft.event.day) ?? placeStartDay
      const normalizedEnd = normalizeDayValue(draft.event.endDay) ?? normalizedStart
      
      // Validation
      const error = getBoundsError(
        normalizedStart, draft.event.time || '',
        normalizedEnd, draft.event.endTime || draft.event.time || '',
        placeStartDay, placeArrivalTime || '',
        placeEndDay, placeDepartureTime || '',
        'Activity'
      )
      if (error) {
        setValidationError(error)
        return
      }

      onSave?.({
        ...draft,
        event: {
          ...draft.event,
          day: normalizedStart,
          endDay: normalizedEnd,
        },
      })
      onClose()
      return
    }

    if (draft.type === 'accommodation' && draft.accommodation) {
      const normalizedStart = normalizeDayValue(draft.accommodation.checkInDay) ?? placeStartDay
      const normalizedEnd = normalizeDayValue(draft.accommodation.checkOutDay) ?? normalizedStart
      
      // Validation
      const error = getBoundsError(
        normalizedStart, draft.accommodation.checkIn || '',
        normalizedEnd, draft.accommodation.checkOut || draft.accommodation.checkIn || '',
        placeStartDay, placeArrivalTime || '',
        placeEndDay, placeDepartureTime || '',
        'Accommodation'
      )
      if (error) {
        setValidationError(error)
        return
      }

      onSave?.({
        ...draft,
        accommodation: {
          ...draft.accommodation,
          checkInDay: normalizedStart,
          checkOutDay: normalizedEnd,
        },
      })
      onClose()
      return
    }

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

  const handleUploadPhoto = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = (e: any) => {
      const files = Array.from(e.target.files) as File[]
      if (files.length === 0) return

      let loadedCount = 0
      const newUrls: string[] = []

      files.forEach(file => {
        const reader = new FileReader()
        reader.onload = (re) => {
          newUrls.push(re.target?.result as string)
          loadedCount++
          if (loadedCount === files.length) {
            if (draft.type === 'accommodation' && draft.accommodation) {
              const currentDay = draft.accommodation.checkInDay || 1
              setDraft({ 
                ...draft, 
                accommodation: { 
                  ...draft.accommodation, 
                  photos: [...(draft.accommodation.photos || []), ...newUrls],
                  photoDays: [...(draft.accommodation.photoDays || []), ...newUrls.map(() => currentDay)]
                } 
              })
            } else if (draft.type === 'event' && draft.event) {
              const currentDay = draft.event.day || 1
              setDraft({ 
                ...draft, 
                event: { 
                  ...draft.event, 
                  photos: [...(draft.event.photos || []), ...newUrls],
                  photoDays: [...(draft.event.photoDays || []), ...newUrls.map(() => currentDay)]
                } 
              })
            }
          }
        }
        reader.readAsDataURL(file)
      })
    }
    input.click()
  }

  const handlePhotoDayChange = (photoIdx: number, newDay: number) => {
    if (draft.type === 'accommodation' && draft.accommodation) {
      const photos = draft.accommodation.photos || []
      const newPhotoDays = [...(draft.accommodation.photoDays || [])]
      while (newPhotoDays.length < photos.length) {
        newPhotoDays.push(draft.accommodation.checkInDay || 1)
      }
      newPhotoDays[photoIdx] = newDay
      setDraft({
        ...draft,
        accommodation: { ...draft.accommodation, photoDays: newPhotoDays }
      })
    } else if (draft.type === 'event' && draft.event) {
      const photos = draft.event.photos || []
      const newPhotoDays = [...(draft.event.photoDays || [])]
      while (newPhotoDays.length < photos.length) {
        newPhotoDays.push(draft.event.day || 1)
      }
      newPhotoDays[photoIdx] = newDay
      setDraft({
        ...draft,
        event: { ...draft.event, photoDays: newPhotoDays }
      })
    }
  }

  // --- 4. Column Content ---
  const leftColumnContent = (
    <div className="space-y-5">
      {validationError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
          <span className="material-symbols-outlined text-red-400 text-base shrink-0">error</span>
          <p className="text-red-200 text-[11px] leading-tight font-medium">{validationError}</p>
        </div>
      )}
      {/* Note Section */}
      {draft.type === 'note' && (
        <div className="space-y-4">
          {isEditMode ? (
            <div className="bg-black/20 rounded-xl p-4 border border-white/10">
              <RichTextEditor
                content={draft.note || ''}
                onChange={val => setDraft({ ...draft, note: val })}
                showToolbar={true}
              />
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              {draft.note?.trim().startsWith('<') ? (
                <div 
                  className="prose-renderer text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: draft.note }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
                      e.stopPropagation();
                      const container = e.currentTarget;
                      const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
                      const index = checkboxes.indexOf(target as HTMLInputElement);
                      
                      if (index !== -1 && draft.note) {
                        const updatedText = toggleHtmlCheckbox(draft.note, index);
                        const updatedDraft = { ...draft, note: updatedText };
                        setDraft(updatedDraft);
                        if (onSave) onSave(updatedDraft);
                      }
                    }
                  }}
                />
              ) : (
                <p className="text-neutral-200 text-sm leading-relaxed whitespace-pre-wrap">{draft.note || 'No content'}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Event Section */}
      {draft.type === 'event' && draft.event && (
        <div className="space-y-4">
          <FormInputGroup
            label="Event Title"
            labelVariant="primary"
            action={isEditMode && (
              <button
                type="button"
                onClick={handleMagicFetch}
                disabled={isFetchingInfo || !draft.event?.title || draft.event.title.length < 3}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-30"
              >
                {isFetchingInfo ? (
                  <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                ) : (
                  <span className="material-symbols-outlined text-xs">auto_awesome</span>
                )}
                Discovery
              </button>
            )}
          >
            <FormInput
              disabled={!isEditMode}
              value={draft.event.title}
              onChange={e => setDraft({ ...draft, event: { ...draft.event!, title: e.target.value } })}
              placeholder="What are we doing?"
            />
          </FormInputGroup>
          
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
              photoDays={draft.event.photoDays || []}
              editing={isEditMode} 
              onMediaClick={(idx) => setMediaViewer({ 
                items: draft.event!.photos!.map((url, i) => ({ 
                  url, 
                  type: getMediaType(url),
                  day: draft.event!.photoDays?.[i]
                })), 
                index: idx 
              })}
              onRemove={(idx) => setDraft({ 
                ...draft, 
                event: { 
                  ...draft.event!, 
                  photos: draft.event!.photos!.filter((_, i) => i !== idx),
                  photoDays: (draft.event!.photoDays || []).filter((_, i) => i !== idx)
                } 
              })}
              onAdd={() => setIsSearchingModalOpen(true)}
              onUpload={handleUploadPhoto}
              onDayClick={handlePhotoDayChange}
              maxDays={totalDays || 10}
              aspectRatio="square"
            />
          </div>

          <FormTextarea
            label="Description"
            labelVariant="primary"
            disabled={!isEditMode}
            value={draft.event.description || ''}
            onChange={e => setDraft({ ...draft, event: { ...draft.event!, description: e.target.value } })}
            className="h-24"
          />

          <div className="space-y-4 pt-2">
            <FormLabel variant="primary" className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">schedule</span> Timing
            </FormLabel>
            <div className="space-y-4">
              <DateTimeSelector
                label="Start"
                icon="login"
                dayValue={normalizeDayValue(draft.event.day) || placeStartDay}
                timeValue={draft.event.time || ''}
                dayOptions={dayOptions}
                onDayChange={d => setDraft({ ...draft, event: { ...draft.event!, day: d } })}
                onTimeChange={t => setDraft({ ...draft, event: { ...draft.event!, time: t } })}
                disabled={!isEditMode}
                timeFormat={timeFormat}
              />
              <DateTimeSelector
                label="End"
                icon="logout"
                dayValue={normalizeDayValue(draft.event.endDay) || normalizeDayValue(draft.event.day) || placeStartDay}
                timeValue={draft.event.endTime || ''}
                dayOptions={dayOptions}
                onDayChange={d => setDraft({ ...draft, event: { ...draft.event!, endDay: d } })}
                onTimeChange={t => setDraft({ ...draft, event: { ...draft.event!, endTime: t } })}
                disabled={!isEditMode}
                timeFormat={timeFormat}
              />
            </div>
          </div>
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
            placeholder="Paste Google Drive or any public document link..."
            onChange={e => {
              const url = e.target.value
              const details = getOnlineDocumentDetails(url)
              let updatedName = draft.document!.name
              if (url && details) {
                if (!updatedName || updatedName.trim() === '' || updatedName.trim().toLowerCase() === 'new document') {
                  if (details.type === 'google-doc') updatedName = 'Google Doc'
                  else if (details.type === 'google-sheet') updatedName = 'Google Sheet'
                  else if (details.type === 'google-slide') updatedName = 'Google Slide'
                  else if (details.type === 'google-form') updatedName = 'Google Form'
                  else if (details.type === 'drive-file') updatedName = 'Google Drive File'
                  else if (details.type === 'pdf') updatedName = 'PDF Document'
                  else updatedName = 'Online Document'
                }
              }
              setDraft({
                ...draft,
                document: {
                  ...draft.document!,
                  url: url,
                  name: updatedName
                }
              })
            }}
          />
          <p className="text-[10px] text-neutral-400 font-medium leading-relaxed !mt-1 flex items-start gap-1">
            <span className="material-symbols-outlined text-[12px] text-primary shrink-0 mt-0.5">info</span>
            <span>Paste Google Drive or any public link (PDF, Docs, Sheets, etc.) here to preview it instantly.</span>
          </p>
          
          <div className="space-y-2">
            <FormLabel variant="primary">File Attachment</FormLabel>
            {isEditMode ? (
              <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-dashed border-white/20 cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => {
                        setDraft(prev => ({ 
                          ...prev, 
                          document: { 
                            ...prev.document!, 
                            name: prev.document?.name === 'New Document' ? file.name : prev.document?.name || file.name,
                            file: reader.result as string,
                            mimeType: file.type 
                          } 
                        }))
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <span className="material-symbols-outlined text-neutral-500">{draft.document.file ? 'check_circle' : 'upload_file'}</span>
                <span className="text-sm text-neutral-400 truncate flex-1">
                  {draft.document.file ? 'File attached' : 'Select a file...'}
                </span>
              </label>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="material-symbols-outlined text-neutral-500">{draft.document.file ? 'description' : 'block'}</span>
                <span className="text-sm text-neutral-400 truncate flex-1">
                  {draft.document.file ? 'File attached' : 'No file attached'}
                </span>
              </div>
            )}
            
            {!isEditMode && draft.document.file && (
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = draft.document!.file!
                  link.download = draft.document!.name || 'document'
                  link.click()
                }}
                className="inline-flex items-center gap-2 text-primary hover:underline text-xs mt-1"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download File
              </button>
            )}
          </div>

          {!isEditMode && draft.document.url && (
            <a href={normalizeUrl(draft.document.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-xs">
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Open URL
            </a>
          )}
        </div>
      )}

      {/* Link Section */}
      {draft.type === 'link' && draft.link && (
        <div className="space-y-4">
          <FormInput
            label="URL"
            labelVariant="primary"
            disabled={!isEditMode}
            value={draft.link.url}
            onChange={e => setDraft({ ...draft, link: { ...draft.link!, url: e.target.value } })}
            placeholder="https://example.com"
          />
          <FormInput
            label="Label (Optional)"
            labelVariant="primary"
            disabled={!isEditMode}
            value={draft.link.title}
            onChange={e => setDraft({ ...draft, link: { ...draft.link!, title: e.target.value } })}
            placeholder="My Custom Title"
          />

          {!isEditMode && draft.link.url && (
            <div className="pt-2">
              <a href={normalizeUrl(draft.link.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                Visit Website
              </a>
            </div>
          )}
        </div>
      )}

      {/* Accommodation Section */}
      {draft.type === 'accommodation' && draft.accommodation && (
        <div className="space-y-5">
          <FormGrid columns={2}>
            <FormInputGroup
              label="Name"
              labelVariant="primary"
              action={isEditMode && (
                <button
                  type="button"
                  onClick={handleMagicFetch}
                  disabled={isFetchingInfo || !draft.accommodation?.name || draft.accommodation.name.length < 3}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 hover:bg-yellow-400/20 transition-all disabled:opacity-30"
                >
                  {isFetchingInfo ? (
                    <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined text-xs">auto_awesome</span>
                  )}
                  Discovery
                </button>
              )}
            >
              <FormInput
                disabled={!isEditMode}
                value={draft.accommodation.name}
                onChange={e => setDraft({ ...draft, accommodation: { ...draft.accommodation!, name: e.target.value } })}
                placeholder="Hotel name..."
              />
            </FormInputGroup>
            <FormSelect
              label="Type"
              labelVariant="primary"
              disabled={!isEditMode}
              value={draft.accommodation.type}
              options={[
                { value: 'hotel', label: 'Hotel' },
                { value: 'airbnb', label: 'Airbnb' },
                { value: 'hostel', label: 'Hostel' },
                { value: 'other', label: 'Other' },
              ]}
              onChange={e => setDraft({ ...draft, accommodation: { ...draft.accommodation!, type: e.target.value as any } })}
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
              photoDays={draft.accommodation.photoDays || []}
              editing={isEditMode} 
              onMediaClick={(idx) => setMediaViewer({ 
                items: draft.accommodation!.photos!.map((url, i) => ({ 
                  url, 
                  type: getMediaType(url),
                  day: draft.accommodation!.photoDays?.[i]
                })), 
                index: idx 
              })}
              onRemove={(idx) => setDraft({ 
                ...draft, 
                accommodation: { 
                  ...draft.accommodation!, 
                  photos: draft.accommodation!.photos!.filter((_, i) => i !== idx),
                  photoDays: (draft.accommodation!.photoDays || []).filter((_, i) => i !== idx)
                } 
              })}
              onAdd={() => setIsSearchingModalOpen(true)}
              onUpload={handleUploadPhoto}
              onDayClick={handlePhotoDayChange}
              maxDays={totalDays || 10}
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
                dayValue={normalizeDayValue(draft.accommodation.checkInDay) || placeStartDay}
                timeValue={draft.accommodation.checkIn || ''}
                dayOptions={dayOptions}
                onDayChange={d => setDraft({ ...draft, accommodation: { ...draft.accommodation!, checkInDay: d } })}
                onTimeChange={t => setDraft({ ...draft, accommodation: { ...draft.accommodation!, checkIn: t } })}
                disabled={!isEditMode}
                timeFormat={timeFormat}
              />
              <DateTimeSelector
                label="Check-out"
                icon="logout"
                dayValue={normalizeDayValue(draft.accommodation.checkOutDay) || normalizeDayValue(draft.accommodation.checkInDay) || placeStartDay}
                timeValue={draft.accommodation.checkOut || ''}
                dayOptions={dayOptions}
                onDayChange={d => setDraft({ ...draft, accommodation: { ...draft.accommodation!, checkOutDay: d } })}
                onTimeChange={t => setDraft({ ...draft, accommodation: { ...draft.accommodation!, checkOut: t } })}
                disabled={!isEditMode}
                timeFormat={timeFormat}
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
            ...allPlaces,
            ...((draft.accommodation?.lat || draft.event?.lat) ? [{
              id: 'attachment-preview',
              name: draft.type === 'accommodation' ? draft.accommodation?.name : draft.event?.title,
              location: draft.type === 'accommodation' ? draft.accommodation?.address : draft.event?.location,
              lat: draft.type === 'accommodation' ? draft.accommodation?.lat : draft.event?.lat,
              lng: draft.type === 'accommodation' ? draft.accommodation?.lng : draft.event?.lng,
              emoji: cfg.emoji,
              photos: draft.type === 'accommodation' ? draft.accommodation?.photos : draft.event?.photos
            }] : [])
          ].filter(p => p.lat != null && p.lng != null)}
          focusedPlaceId={(draft.accommodation?.lat || draft.event?.lat) ? 'attachment-preview' : placeId}
          showDayNumbers={true}
          showControls={true}
          mapStyle={mapStyle}
          onMarkerClick={(p) => {
            if (p.id === 'attachment-preview') return;
            if (p.id === placeId) return;
          }}
          onMapClick={(coords) => {
            if (draft.type === 'accommodation') {
              setDraft({ ...draft, accommodation: { ...draft.accommodation!, lat: coords.lat, lng: coords.lng } })
            } else if (draft.type === 'event') {
              setDraft({ ...draft, event: { ...draft.event!, lat: coords.lat, lng: coords.lng } })
            }
          }}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-4 h-full relative overflow-hidden">
          {/* Subtle background glow for the preview panel */}
          {draft.type === 'link' && draft.link?.url && draft.link.url.match(/^https?:\/\//) && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-400/10 blur-[80px] rounded-full pointer-events-none" />
            </>
          )}
          
          {draft.document?.file && draft.document?.mimeType?.startsWith('image/') ? (
            <img src={draft.document.file} className="w-full h-full object-cover" alt="Document Preview" />
          ) : draft.type === 'document' && draft.document?.url && draft.document.url.match(/^https?:\/\//) ? (
            (() => {
              const details = getOnlineDocumentDetails(draft.document.url)
              if (details && details.embedUrl) {
                return (
                  <div className="w-full h-full flex flex-col p-4 bg-black/20 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                    <iframe 
                      src={details.embedUrl} 
                      className="w-full h-full border-none rounded-2xl bg-white shadow-2xl" 
                      title={draft.document.name}
                      allow="autoplay"
                    />
                  </div>
                )
              }
              const info = getDocumentIconAndBadge(draft.document.url, undefined)
              return (
                <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-[280px] px-8 animate-in fade-in zoom-in-95 duration-500 relative z-10">
                  <div className={`w-32 h-32 rounded-[2.5rem] ${info.bg} ${info.border} border flex items-center justify-center overflow-hidden p-2 shadow-2xl relative transition-transform duration-500 hover:scale-105`}>
                    <span className={`material-symbols-outlined ${info.color} text-5xl`}>{info.icon}</span>
                  </div>
                  <div className="text-center w-full space-y-3">
                    <div className="text-white text-lg font-bold truncate tracking-tight px-2 drop-shadow-md">{draft.document.name}</div>
                    <div className={`inline-block px-4 py-1.5 rounded-full ${info.bg} border ${info.border} ${info.color} text-[10px] font-black uppercase tracking-[0.2em] truncate max-w-full shadow-inner backdrop-blur-md`}>
                      {info.label}
                    </div>
                  </div>
                </div>
              )
            })()
          ) : draft.type === 'link' && draft.link?.url && draft.link.url.match(/^https?:\/\//) ? (
            <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-[280px] px-8 animate-in fade-in zoom-in-95 duration-500 relative z-10">
              {(() => {
                const domain = draft.link!.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
                const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
                return (
                  <>
                    <div className="w-32 h-32 rounded-[2.5rem] bg-white flex items-center justify-center overflow-hidden p-2 shadow-2xl shadow-cyan-900/50 relative group ring-1 ring-white/10 transition-transform duration-500 hover:scale-105">
                      <img 
                        src={favicon}
                        className="w-full h-full object-contain relative z-10 rounded-[2rem]" 
                        alt="" 
                        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%2322d3ee" stroke-width="2" opacity="0.4"><circle cx="12" cy="12" r="10"/></svg>' }} 
                      />
                    </div>
                    <div className="text-center w-full space-y-3">
                      <div className="text-white text-lg font-bold truncate tracking-tight px-2 drop-shadow-md">{draft.link!.title || draft.link!.url}</div>
                      <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-black uppercase tracking-[0.2em] truncate max-w-full shadow-inner backdrop-blur-md">
                        {domain}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <>
              <div className={`w-20 h-20 rounded-full ${cfg.color.replace('text-', 'bg-')}/10 border border-white/10 flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-4xl ${cfg.color} opacity-40`}>{cfg.icon}</span>
              </div>
              <p className="text-xs font-bold opacity-30">No Preview Available</p>
            </>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <BaseDetailModal
        isOpen={true}
        onClose={onClose}
        isEditMode={isEditMode}
        title={title}
        subtitle={subtitle}
        icon={cfg.icon}
        iconColor={cfg.color}
        leftColumn={leftColumnContent}
        rightColumn={rightColumnContent}
        footer={
          <div className="flex items-center justify-between w-full">
            {isEditMode && onDelete && (
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
                  <button 
                    onClick={() => setIsEditMode(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium active:scale-95"
                  >
                    Cancel
                  </button>
                  <Button variant="modal-primary" icon="save" disabled={!isValid()} onClick={handleSave}>Save Changes</Button>
                </React.Fragment>
              ) : (
                <React.Fragment key="view-mode-actions">
                  <button 
                    onClick={(e) => {
                      const el = e.currentTarget;
                      el.classList.add('animate-[spin_0.3s_ease-out]');
                      setTimeout(() => setIsEditMode(true), 150);
                    }}
                    className="group flex items-center justify-center w-10 h-10 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    title="Edit Details"
                  >
                    <span className="material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:rotate-12 group-active:-rotate-45">edit</span>
                  </button>
                  <Button variant="modal-primary" onClick={onClose}>Close</Button>
                </React.Fragment>
              )}
            </div>
          </div>
        }
      />

      {mediaViewer && (
        <MediaViewer
          items={mediaViewer.items}
          initialIndex={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
        />
      )}

      {isLocationPickerOpen && (
        <LocationPickerModal
          isOpen={true}
          onClose={() => setIsLocationPickerOpen(false)}
          mapStyle={mapStyle}
          allPlaces={allPlaces}
          focusedPlaceId={placeId}
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
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <div className="relative">
                <input
                  autoFocus
                  placeholder="Search for photos..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white outline-none focus:border-primary/50 text-sm transition-all placeholder-neutral-500"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery)}
                />
                <button onClick={() => handleSearch(searchQuery)} className="absolute right-3 top-2.5 text-neutral-500 hover:text-white">
                  <span className="material-symbols-outlined text-xs">{isSearching ? 'refresh' : 'search'}</span>
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
                          const isRemoving = isSelected;
                          const currentPhotoDays = draft.type === 'accommodation' ? (draft.accommodation?.photoDays || []) : (draft.event?.photoDays || [])
                          
                          let newPhotos = isRemoving 
                            ? currentPhotos.filter(p => p !== photo)
                            : [...currentPhotos, photo]
                          
                          let newPhotoDays = isRemoving
                            ? currentPhotoDays.filter((_, idx) => currentPhotos[idx] !== photo)
                            : [...currentPhotoDays, (draft.type === 'accommodation' ? draft.accommodation?.checkInDay : draft.event?.day) || 1]
                          
                          if (draft.type === 'accommodation') {
                            setDraft({ ...draft, accommodation: { ...draft.accommodation!, photos: newPhotos, photoDays: newPhotoDays } })
                          } else if (draft.type === 'event') {
                            setDraft({ ...draft, event: { ...draft.event!, photos: newPhotos, photoDays: newPhotoDays } })
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
