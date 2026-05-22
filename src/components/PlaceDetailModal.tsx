import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Place, Note, normalizeUrl } from '@/lib/storage'
import { getDayWithDate, getDayInfo, formatTime } from '@/lib/date-utils'
import dynamic from 'next/dynamic'
import { DateTimeSelector } from '@/components/DateTimeSelector'
import MediaViewer from '@/components/MediaViewer'
import { searchWallpapers } from '@/lib/wallpaper-search'
import { calculateDistance } from '@/lib/discovery'
import {
  ModalBackdrop,
  ModalContainer,
  ModalHeader,
  ModalContent,
  ModalFooter,
  BaseDetailModal
} from '@/components/ModalLayout'
import { getBoundsError } from '@/lib/itinerary-utils'
import { AttachmentDetailData } from '@/components/AttachmentDetailModal'
import AttachmentDetailModal from '@/components/AttachmentDetailModal'
import type { AttachmentType } from './AttachmentModal'
import { useTrips } from '@/context/TripContext'
import { toggleHtmlCheckbox, ensureHtml } from '@/lib/rich-text-utils'
import { MediaGrid } from '@/components/MediaGrid'
import { Button } from '@/components/Button'
import { FormLabel, FormListItem, FormTextarea } from '@/components/FormLayout'
import { fetchLocationInfo } from '@/lib/image-utils'
import { isWithinBounds } from '@/lib/itinerary-utils'
import { ConfirmationModal } from './ConfirmationModal'
import RichTextEditor from '@/components/RichTextEditor'
import { getDocumentIconAndBadge, getOnlineDocumentDetails } from '@/lib/document-utils'

const MapPreview = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div className="h-48 bg-neutral-800/50 rounded-xl flex items-center justify-center text-neutral-500">Loading map...</div>
})

function getMediaType(url: string): 'image' | 'video' | 'pdf' | 'other' {
  if (url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith('data:video')) return 'video'
  if (url.match(/\.pdf$/i) || url.startsWith('data:application/pdf')) return 'pdf'
  if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) || url.startsWith('data:image')) return 'image'
  return 'other'
}

interface PlaceDetailModalProps {
  place: Place
  allPlaces?: Place[]
  tripStartDate: string
  tripEndDate: string
  onClose: () => void
  onSave: (updatedPlace: Place) => void
  onDelete?: () => void
  isEditMode?: boolean
  isNew?: boolean
  initialDay?: number
  onSearchResultClick?: (place: any) => void
  onMapClick?: (coords: { lat: number, lng: number }) => void
  lastStopCoords?: { lat: number, lng: number } | null
  onEditTransport?: (globalIndex: number, position: 'before' | 'after', legId?: string) => void
  onOpenTransport?: (transport: any, fromName: string, toName: string) => void
  onOpenPlace?: (place: Place) => void
  onEditLocation?: () => void
  mapStyle?: string
  onAddAttachment?: (type: AttachmentType, placeId: string, day?: number) => void
  onAddTransport?: (placeId: string, day?: number) => void
  timeFormat?: '12h' | '24h'
  minDay?: number
  minTime?: string
  maxDay?: number
  maxTime?: string
  initialAttachmentDetail?: AttachmentDetailData
}

export default function PlaceDetailModal({ 
  place, 
  allPlaces = [],
  tripStartDate, 
  tripEndDate, 
  onClose,
  onSave,
  onDelete,
  isEditMode: initialEditMode = false,
  isNew = false,
  initialDay,
  lastStopCoords,
  onOpenTransport = () => {},
  onOpenPlace = () => {},
  onMapClick,
  onEditLocation,
  mapStyle,
  onAddAttachment,
  onAddTransport,
  timeFormat = '12h',
  minDay,
  minTime,
  maxDay,
  maxTime,
  initialAttachmentDetail
}: PlaceDetailModalProps) {
  // --- 1. State & Logic ---
  const [isEditMode, setIsEditMode] = useState(initialEditMode)
  const [updatedPlace, setUpdatedPlace] = useState<Place>(() => {
    const p = { ...place }
    if (typeof p.notes === 'string') {
      const oldText = p.notes
      p.notes = oldText ? [{ id: Math.random().toString(36).substr(2, 9), day: p.day || 1, text: oldText }] : []
    }
    
    // Consolidate multiple notes for the same day to avoid "phantom" notes in the editor
    if (Array.isArray(p.notes)) {
      const consolidated: Note[] = []
      const dayMap = new Map<number, Note>()
      
      p.notes.forEach(note => {
        if (!note.text) return
        const existing = dayMap.get(note.day)
        if (existing) {
          existing.text = existing.text.trim() + '\n\n' + note.text.trim()
        } else {
          const newNote = { ...note }
          dayMap.set(note.day, newNote)
          consolidated.push(newNote)
        }
      })
      p.notes = consolidated
    }
    if ((p as any).accommodation && !p.accommodations) {
      p.accommodations = [(p as any).accommodation]
      delete (p as any).accommodation
    }
    return p
  })

  const [notes, setNotes] = useState<Note[]>(updatedPlace.notes || [])
  const [arrivalTime, setArrivalTime] = useState(updatedPlace.arrival || '')
  const [departureTime, setDepartureTime] = useState(updatedPlace.departure || '')
  const [attachmentDetail, setAttachmentDetail] = useState<AttachmentDetailData | null>(initialAttachmentDetail || null)
  const [inlineLinkInput, setInlineLinkInput] = useState(false)
  const [inlineLinkUrl, setInlineLinkUrl] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [mediaViewer, setMediaViewer] = useState<{ items: any[]; index: number } | null>(null)
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false)
  const [imageSearchQuery, setImageSearchQuery] = useState('')
  const [imageSearchResults, setImageSearchResults] = useState<string[]>([])
  const [isImageSearching, setIsImageSearching] = useState(false)
  const imageSearchInputRef = useRef<HTMLInputElement>(null)
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(() => {
    // By default, if initialDay is provided, collapse everything ELSE.
    // If no initialDay, keep everything expanded (empty set).
    return new Set()
  })
  const [isFetchingInfo, setIsFetchingInfo] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['details', 'activities', 'notes']))

  const handleMagicFetch = async () => {
    const name = updatedPlace.name
    if (!name || name.length < 3) return

    setIsFetchingInfo(true)
    try {
      const info = await fetchLocationInfo(name)
      if (info) {
        const nextPlace = {
          ...updatedPlace,
          location: info.address || updatedPlace.location,
          lat: info.lat || updatedPlace.lat,
          lng: info.lng || updatedPlace.lng,
          photos: [...(updatedPlace.photos || []), ...info.images.filter(img => !updatedPlace.photos?.includes(img))],
          notes: info.description ? [{ id: Math.random().toString(36).substr(2, 9), day: updatedPlace.day || 1, text: info.description }, ...notes] : notes
        }
        setNotes(nextPlace.notes || [])
        commitPlaceUpdate(nextPlace)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsFetchingInfo(false)
    }
  }
  const currentMediaDay = Array.from({ length: 1 }, (_, i) => updatedPlace.day || 1)[0] // Placeholder for current active day logic if needed

  const toggleSection = (id: string) => {
    const next = new Set(openSections)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpenSections(next)
  }

  const toggleDayCollapse = (day: number) => {
    setCollapsedDays(prev => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const expandAllDays = () => setCollapsedDays(new Set())
  const collapseAllDays = (start: number, count: number) => {
    const all = new Set<number>()
    for (let i = 0; i < count; i++) all.add(start + i)
    setCollapsedDays(all)
  }
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  // --- 2. Derived State ---
  const allDaysCount = useMemo(() => {
    if (!tripStartDate || !tripEndDate) return 1
    const start = new Date(tripStartDate)
    const end = new Date(tripEndDate)
    const diff = end.getTime() - start.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
  }, [tripStartDate, tripEndDate])

  const dayOptions = useMemo(() => {
    const options = []
    // Add 3 days before Day 1
    for (let i = -2; i <= 0; i++) {
      options.push({
        value: i,
        label: getDayWithDate(tripStartDate, i)
      })
    }
    // Standard trip days
    for (let i = 1; i <= allDaysCount; i++) {
      options.push({
        value: i,
        label: getDayWithDate(tripStartDate, i)
      })
    }
    // Add 3 days after last day
    for (let i = allDaysCount + 1; i <= allDaysCount + 3; i++) {
      options.push({
        value: i,
        label: getDayWithDate(tripStartDate, i)
      })
    }
    return options
  }, [allDaysCount, tripStartDate])

  // --- 3. Handlers ---


  const validateAndSave = (proposedPlace: Place): boolean => {
    const error = getBoundsError(
      proposedPlace.day || 1, proposedPlace.arrival || '',
      proposedPlace.endDay || proposedPlace.day || 1, proposedPlace.departure || '',
      minDay || 1, minTime || '',
      maxDay || 999, maxTime || '',
      'Place'
    )
    setArrivalTime(proposedPlace.arrival || '')
    setDepartureTime(proposedPlace.departure || '')
    if (error) {
      setValidationError(error)
      setUpdatedPlace(proposedPlace)
      return false
    } else {
      setValidationError(null)
      setUpdatedPlace(proposedPlace)
      if (!isNew) onSave(proposedPlace)
      return true
    }
  }

  const handleArrivalChange = (val: string) => {
    validateAndSave({ ...updatedPlace, arrival: val })
  }

  const handleDepartureChange = (val: string) => {
    validateAndSave({ ...updatedPlace, departure: val })
  }

  const handleNoteChange = (id: string, text: string) => {
    const newNotes = notes.map(n => n.id === id ? { ...n, text } : n)
    setNotes(newNotes)
    const updated = { ...updatedPlace, notes: newNotes }
    setUpdatedPlace(updated)
    if (!isNew) onSave(updated)
  }

  const handleDeleteNote = (id: string) => {
    const newNotes = notes.filter(n => n.id !== id)
    setNotes(newNotes)
    const updated = { ...updatedPlace, notes: newNotes }
    setUpdatedPlace(updated)
    if (!isNew) onSave(updated)
  }

  const handleAddNote = (day: number) => {
    const newNote: Note = { id: Math.random().toString(36).substr(2, 9), day, text: '' }
    const newNotes = [...notes, newNote]
    setNotes(newNotes)
    const updated = { ...updatedPlace, notes: newNotes }
    setUpdatedPlace(updated)
    if (!isNew) onSave(updated)
  }

  const handleDeleteTransport = (legId: string, sourcePlaceId: string) => {
    const trips = JSON.parse(localStorage.getItem('trippi_trips') || '[]')
    const tripId = (allPlaces[0] as any)?.tripId // Use tripId from any place
    if (!tripId) return

    const updatedPlaces = allPlaces.map(p => {
      if (p.id === sourcePlaceId) {
        return { ...p, transport: (p.transport || []).filter((t: any) => t.id !== legId) }
      }
      return p
    })

    // Update local state
    const updatedPlaceSource = updatedPlaces.find(p => p.id === place.id)
    if (updatedPlaceSource) setUpdatedPlace(updatedPlaceSource)
    
    // In a real app, this should call onSave with the whole trip or specific place
    if (!isNew) onSave(updatedPlaceSource || updatedPlace)
  }

  const handleRemovePhoto = (idx: number) => {
    const updated = { 
      ...updatedPlace, 
      photos: updatedPlace.photos?.filter((_, i) => i !== idx),
      photoDays: updatedPlace.photoDays?.filter((_, i) => i !== idx)
    }
    setUpdatedPlace(updated)
    if (!isNew) onSave(updated)
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
            const newPhotos = [...(updatedPlace.photos || []), ...newUrls]
            const newPhotoDays = [...(updatedPlace.photoDays || []), ...newUrls.map(() => currentMediaDay)]
            const updated = { ...updatedPlace, photos: newPhotos, photoDays: newPhotoDays }
            setUpdatedPlace(updated)
            if (!isNew) onSave(updated)
          }
        }
        reader.readAsDataURL(file)
      })
    }
    input.click()
  }

  const handleImageSearch = async (query: string) => {
    if (!query.trim()) return
    setIsImageSearching(true)
    try {
      const results = await searchWallpapers(query)
      setImageSearchResults(results)
    } catch (e) {
      console.error('Failed to search images', e)
    } finally {
      setIsImageSearching(false)
    }
  }

  const toggleCheckpoint = (noteId: string, checkpointIdx: number) => {
    const newNotes = notes.map(n => {
      if (n.id === noteId) {
        let currentIdx = 0
        const newText = n.text.replace(/\[[ xX]\]/g, (match) => {
          if (currentIdx++ === checkpointIdx) {
            return match === '[ ]' ? '[x]' : '[ ]'
          }
          return match
        })
        return { ...n, text: newText }
      }
      return n
    })
    setNotes(newNotes)
    const updated = { ...updatedPlace, notes: newNotes }
    setUpdatedPlace(updated)
    if (!isNew) onSave(updated)
  }

  const renderNoteText = (text: string, noteId: string) => {
    if (!text) return <span className="text-neutral-500 italic text-xs">No notes...</span>
    
    // If it looks like HTML, render it directly with the prose-renderer class
    if (text.trim().startsWith('<')) {
      return (
        <div 
          className="prose-renderer text-sm leading-relaxed text-neutral-200 font-medium"
          dangerouslySetInnerHTML={{ __html: text }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
              e.stopPropagation();
              const container = e.currentTarget;
              const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
              const index = checkboxes.indexOf(target as HTMLInputElement);
              
              if (index !== -1) {
                const updatedText = toggleHtmlCheckbox(text, index);
                
                // Update local and context state
                const nextNotes = updatedPlace.notes?.map(n => n.id === noteId ? { ...n, text: updatedText } : n) || [];
                const nextPlace = {
                  ...updatedPlace,
                  notes: nextNotes
                };
                setNotes(nextNotes);
                setUpdatedPlace(nextPlace);
                commitPlaceUpdate(nextPlace);
              }
            }
          }}
        />
      )
    }

    const parts = text.split(/(\[[ xX]\])/g)
    let checkpointIdx = 0
    return (
      <div className="space-y-2">
        {parts.map((part, i) => {
          if (part.match(/\[[ xX]\]/)) {
            const idx = checkpointIdx++
            const isChecked = part.toLowerCase() === '[x]'
            return (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleCheckpoint(noteId, idx)
                }}
                className={`inline-flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all ${
                  isChecked 
                    ? 'bg-primary/10 border-primary/20 text-primary shadow-inner shadow-primary/10' 
                    : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isChecked ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <span className="text-xs font-bold">{isChecked ? 'Completed' : 'To Do'}</span>
              </button>
            )
          }
          return <span key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{part}</span>
        })}
      </div>
    )
  }

  const openViewer = (items: string[], index: number, days?: (number | null)[]) => {
    setMediaViewer({ 
      items: items.map((url, i) => ({ 
        url, 
        type: getMediaType(url),
        day: days?.[i] ?? undefined
      })), 
      index 
    })
  }

  const handleDeleteEvent = (id: string) => {
    const updated = { ...updatedPlace, events: updatedPlace.events?.filter(e => e.id !== id) }
    setUpdatedPlace(updated)
    if (!isNew) onSave(updated)
  }

  const handleDeleteAccommodation = (id: string) => {
    const updated = { ...updatedPlace, accommodations: updatedPlace.accommodations?.filter(a => a.id !== id) }
    setUpdatedPlace(updated)
    if (!isNew) onSave(updated)
  }

  const handleDeleteDocument = (id: string) => {
    const updated = { ...updatedPlace, documents: updatedPlace.documents?.filter(d => d.id !== id) }
    setUpdatedPlace(updated)
    if (!isNew) onSave(updated)
  }

  const handleDeleteLink = (id: string) => {
    const updated = { ...updatedPlace, links: updatedPlace.links?.filter(l => l.id !== id) }
    setUpdatedPlace(updated)
    if (!isNew) onSave(updated)
  }

  const handleSaveInlineLink = () => {
    if (!inlineLinkUrl.trim()) return
    let url = inlineLinkUrl.trim()
    if (!/^[a-zA-Z][a-zA-Z\d.+\-]*:/.test(url)) {
      url = `https://${url}`
    }
    const details = getOnlineDocumentDetails(url)
    let autoName = 'Online Document'
    if (details) {
      if (details.type === 'google-doc') autoName = 'Google Doc'
      else if (details.type === 'google-sheet') autoName = 'Google Sheet'
      else if (details.type === 'google-slide') autoName = 'Google Slide'
      else if (details.type === 'google-form') autoName = 'Google Form'
      else if (details.type === 'drive-file') autoName = 'Google Drive File'
      else if (details.type === 'pdf') autoName = 'PDF Document'
    }
    const newDoc = {
      id: Date.now().toString(),
      name: autoName,
      type: 'other' as const,
      url: url,
      day: currentMediaDay
    }
    const nextPlace = { ...updatedPlace, documents: [...(updatedPlace.documents || []), newDoc] }
    commitPlaceUpdate(nextPlace)
    setInlineLinkInput(false)
    setInlineLinkUrl('')
  }

  const commitPlaceUpdate = (nextPlace: Place) => {
    setUpdatedPlace(nextPlace)
    if (!isNew) onSave(nextPlace)
  }

  const createDraftAttachment = (type: AttachmentType) => {
    const draftId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    if (type === 'accommodation') {
      const accommodation = {
        id: draftId,
        name: 'New stay',
        type: 'hotel' as const,
        checkIn: '',
        checkInDay: currentMediaDay,
        checkOut: '',
        checkOutDay: currentMediaDay,
        documents: [],
        photos: [],
      }
      const nextPlace = { ...updatedPlace, accommodations: [...(updatedPlace.accommodations || []), accommodation] }
      commitPlaceUpdate(nextPlace)
      setAttachmentDetail({ type: 'accommodation', accommodation })
      return
    }

    if (type === 'event') {
      const event = {
        id: draftId,
        title: 'New activity',
        description: '',
        time: '',
        endTime: '',
        date: '',
        type: 'activity' as const,
        location: '',
        documents: [],
        photos: [],
        day: currentMediaDay,
        endDay: currentMediaDay,
      }
      const nextPlace = { ...updatedPlace, events: [...(updatedPlace.events || []), event] }
      commitPlaceUpdate(nextPlace)
      setAttachmentDetail({ type: 'event', event })
      return
    }

    if (type === 'document') {
      const document = {
        id: draftId,
        name: 'New document',
        type: 'other' as const,
        day: currentMediaDay,
      }
      const nextPlace = { ...updatedPlace, documents: [...(updatedPlace.documents || []), document] }
      commitPlaceUpdate(nextPlace)
      setAttachmentDetail({ type: 'document', document })
      return
    }

    if (type === 'link') {
      const link = {
        id: draftId,
        title: 'New link',
        url: '',
        day: currentMediaDay,
      }
      const nextPlace = { ...updatedPlace, links: [...(updatedPlace.links || []), link] }
      commitPlaceUpdate(nextPlace)
      setAttachmentDetail({ type: 'link', link })
    }
  }

  const handleAddAttachment = (type: AttachmentType) => {
    if (!isNew && onAddAttachment) {
      onAddAttachment(type, updatedPlace.id, currentMediaDay)
      return
    }
    createDraftAttachment(type)
  }

  const handleAddTransport = () => {
    if (onAddTransport && !isNew) {
      onAddTransport(updatedPlace.id, currentMediaDay)
    }
  }

  // --- 4. Effects ---
  useEffect(() => {
    if (isImageSearchOpen) {
      const q = updatedPlace.name || ''
      setImageSearchQuery(q)
      handleImageSearch(q)
    }
  }, [isImageSearchOpen, updatedPlace.name])

  // --- 5. Column Definitions ---
  const CollapsibleSection = ({ 
    id, 
    title, 
    icon, 
    children,
    badge
  }: { 
    id: string, 
    title: string, 
    icon: string, 
    children: React.ReactNode,
    badge?: React.ReactNode
  }) => {
    const isOpen = openSections.has(id)
    return (
      <div className="border-b border-white/5 last:border-0">
        <button 
          onClick={() => toggleSection(id)}
          className={`w-full flex items-center justify-between py-3 px-1 transition-all ${isOpen ? 'text-primary' : 'text-white/40 hover:text-white/60'}`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-base opacity-70">{icon}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
            {badge}
          </div>
          <span className={`material-symbols-outlined text-base transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
        {isOpen && (
          <div className="pb-4 animate-in slide-in-from-top-1 duration-200">
            {children}
          </div>
        )}
      </div>
    )
  }

  const leftColumnContent = (
    <div className="space-y-1">
      {/* Logistics Reality Check Warning */}
      {lastStopCoords && updatedPlace.lat && updatedPlace.lng && (
        (() => {
          const dist = calculateDistance(lastStopCoords.lat, lastStopCoords.lng, Number(updatedPlace.lat), Number(updatedPlace.lng));
          if (dist > 150) {
            return (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-4 animate-in slide-in-from-top-4 duration-500 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-red-400">warning</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-100">Logistics Reality Check</h4>
                  <p className="text-xs text-red-500/80 leading-relaxed mt-0.5">
                    This place is <b className="text-red-400">{Math.round(dist)}km</b> away from your previous stop. That's a ~{Math.round(dist/75)} hour journey!
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()
      )}

      {/* 1. Note Section */}
      <div className="space-y-4 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <FormLabel variant="primary" className="!mb-0 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">sticky_note_2</span> Notes & Checkpoints
          </FormLabel>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const start = updatedPlace.day || 1;
                const end = updatedPlace.endDay || start;
                expandAllDays();
              }}
              className="text-[9px] font-bold text-neutral-500 hover:text-primary uppercase tracking-wider transition-colors"
            >
              Expand All
            </button>
            <span className="text-neutral-700 text-[9px]">•</span>
            <button 
              onClick={() => {
                const start = updatedPlace.day || 1;
                const end = updatedPlace.endDay || start;
                collapseAllDays(start, end - start + 1);
              }}
              className="text-[9px] font-bold text-neutral-500 hover:text-primary uppercase tracking-wider transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {(() => {
            const start = updatedPlace.day || 1
            const end = updatedPlace.endDay || start
            const daysCount = end - start + 1
            
            return Array.from({ length: daysCount }, (_, i) => {
              const d = start + i
              const dayNote = notes.find(n => n.day === d)
              const isCollapsed = collapsedDays.has(d)
              const isExpanded = !isCollapsed
              const dateInfo = getDayInfo(tripStartDate, d)

              return (
                <div key={`day-notes-${d}`} className="overflow-hidden rounded-xl border border-white/5 bg-white/5">
                  <button
                    onClick={() => toggleDayCollapse(d)}
                    className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
                      isExpanded ? 'bg-primary/10 text-primary' : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 shrink-0 ${isExpanded ? 'text-primary' : 'text-white/40'}`}>
                        Day {d}
                      </span>
                      <div className="flex flex-col items-start min-w-0">
                        <p className="text-[10px] font-bold whitespace-nowrap">{dateInfo.dayName}, {dateInfo.dateStr}</p>
                        {!isExpanded && dayNote?.text && (
                          <p className="text-[9px] text-white/30 truncate w-full pr-4">
                            {dayNote.text.replace(/\[[ xX]\]/g, '').trim()}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="p-3 border-t border-white/5 bg-black/20 animate-in slide-in-from-top-1 duration-200">
                      {isEditMode ? (
                        <RichTextEditor
                            content={ensureHtml(dayNote?.text || '')}
                            onChange={(newText) => {
                              let newNotes = [...notes]
                              const idx = newNotes.findIndex(n => n.day === d)
                              if (idx >= 0) {
                                newNotes[idx] = { ...newNotes[idx], text: newText }
                              } else {
                                newNotes.push({ id: Math.random().toString(36).substr(2, 9), day: d, text: newText })
                              }
                              setNotes(newNotes)
                              const updated = { ...updatedPlace, notes: newNotes }
                              setUpdatedPlace(updated)
                              if (!isNew) onSave(updated)
                            }}
                            placeholder={`Write something for Day ${d}...`}
                            showToolbar={true}
                          />
                      ) : (
                        <div className="text-xs">
                          {dayNote?.text ? renderNoteText(dayNote.text, dayNote.id || '') : (
                            <p className="text-white/20 italic font-medium">No notes for this day</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* 2. Media Section */}
      <div className="space-y-4 pb-4 border-b border-white/10">
        <FormLabel variant="primary" className="mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">photo_library</span> Media
        </FormLabel>
        <MediaGrid
          photos={updatedPlace.photos || []}
          photoDays={(updatedPlace.photos || []).map((_, i) => updatedPlace.photoDays?.[i] ?? currentMediaDay)}
          editing={isEditMode}
          onMediaClick={(idx) => openViewer(updatedPlace.photos!, idx, updatedPlace.photoDays)}
          onRemove={handleRemovePhoto}
          onAdd={() => setIsImageSearchOpen(true)}
          onUpload={handleUploadPhoto}
        />
      </div>

      {/* 3. Schedule */}
      <div className="space-y-4 pb-4 border-b border-white/10">
        <FormLabel variant="primary" className="mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">schedule</span> Schedule
        </FormLabel>

        {validationError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
            <span className="material-symbols-outlined text-red-400 text-base shrink-0">error</span>
            <p className="text-red-200 text-[11px] leading-tight font-medium">{validationError}</p>
          </div>
        )}

        <div className="space-y-4">
          <DateTimeSelector
            label="Arrival"
            icon="login"
            dayValue={updatedPlace.day || 1}
            timeValue={arrivalTime}
            dayOptions={dayOptions}
            onDayChange={(d) => {
              validateAndSave({ ...updatedPlace, day: d })
            }}
            onTimeChange={handleArrivalChange}
            disabled={!isEditMode}
            timeFormat={timeFormat}
          />
          
          <DateTimeSelector
            label="Departure"
            icon="logout"
            dayValue={updatedPlace.endDay || updatedPlace.day || 1}
            timeValue={departureTime}
            dayOptions={dayOptions}
            onDayChange={(d) => {
              validateAndSave({ ...updatedPlace, endDay: d })
            }}
            onTimeChange={handleDepartureChange}
            disabled={!isEditMode}
            timeFormat={timeFormat}
          />
        </div>
      </div>

      {/* 4. Accommodation */}
      {(isEditMode || (updatedPlace.accommodations?.length || 0) > 0) && (
        <div className="space-y-4 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <FormLabel variant="primary" className="flex items-center gap-2 !mb-0">
              <span className="material-symbols-outlined text-base">bed</span> Accommodation
            </FormLabel>
            {isEditMode && (
              <button
                type="button"
                onClick={() => handleAddAttachment('accommodation')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 hover:bg-yellow-400/20 transition-colors"
                title="Add Accommodation"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span className="material-symbols-outlined text-xs text-yellow-400">bed</span>
              </button>
            )}
          </div>
          <div className="space-y-3">
            {updatedPlace.accommodations?.map((acc, idx) => (
              <FormListItem key={acc.id || `acc-${idx}`} onDelete={isEditMode ? () => handleDeleteAccommodation(acc.id) : undefined} className="group border-yellow-400/20" onClick={() => setAttachmentDetail({ type: 'accommodation', accommodation: acc })}>
                <div className="flex items-center gap-3 w-full p-1">
                  <span className="text-yellow-400 material-symbols-outlined text-base">bed</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate mb-0.5">{acc.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-[10px] font-mono flex items-center">
                        {(() => {
                          const start = acc.checkInDay || updatedPlace.day || 1
                          const end = acc.checkOutDay || acc.checkInDay || updatedPlace.day || 1
                          const isMulti = end > start
                          
                          const isOutOfBounds = !isWithinBounds(start, acc.checkIn || '', updatedPlace.day || 1, arrivalTime || '', updatedPlace.endDay || updatedPlace.day || 1, departureTime || '') ||
                                              !isWithinBounds(end, acc.checkOut || acc.checkIn || '', updatedPlace.day || 1, arrivalTime || '', updatedPlace.endDay || updatedPlace.day || 1, departureTime || '')

                          return (
                            <div className="flex items-center gap-2">
                              {isMulti && <span className="text-primary font-bold mr-1">D{start}</span>}
                              {formatTime(acc.checkIn, timeFormat)}
                              <span className="mx-1 opacity-50">→</span>
                              {isMulti && <span className="text-primary font-bold mr-1">D{end}</span>}
                              {formatTime(acc.checkOut, timeFormat)}
                              {isOutOfBounds && (
                                <span className="material-symbols-outlined text-red-400 text-xs ml-1 animate-pulse" title="Time is outside place bounds">warning</span>
                              )}
                            </div>
                          )
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </FormListItem>
            ))}
            {isEditMode && !updatedPlace.accommodations?.length && (
              <p className="text-neutral-200/40 text-[10px] font-bold text-center py-2">No accommodation added</p>
            )}
          </div>
        </div>
      )}

      {/* 5. Activities */}
      {(isEditMode || (updatedPlace.events?.length || 0) > 0) && (
        <div className="space-y-4 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <FormLabel variant="primary" className="flex items-center gap-2 !mb-0">
              <span className="material-symbols-outlined text-base">flag</span> Activities
            </FormLabel>
            {isEditMode && (
              <button
                type="button"
                onClick={() => handleAddAttachment('event')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 transition-colors"
                title="Add Activity"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span className="material-symbols-outlined text-xs text-red-400">flag</span>
              </button>
            )}
          </div>
          <div className="space-y-3">
            {updatedPlace.events?.map((event, idx) => (
              <FormListItem key={event.id || `event-${idx}`} onDelete={isEditMode ? () => handleDeleteEvent(event.id) : undefined} className="group border-red-400/20" onClick={() => setAttachmentDetail({ type: 'event', event })}>
                <div className="flex items-center gap-3 w-full p-1">
                  <span className="text-red-400 material-symbols-outlined text-base">flag</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate mb-0.5">{event.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-[10px] font-mono flex items-center">
                        {(() => {
                          const start = event.day || updatedPlace.day || 1
                          const end = event.endDay || event.day || updatedPlace.day || 1
                          const isMulti = end > start
                          
                          const isOutOfBounds = !isWithinBounds(start, event.time || '', updatedPlace.day || 1, arrivalTime || '', updatedPlace.endDay || updatedPlace.day || 1, departureTime || '') ||
                                              !isWithinBounds(end, event.endTime || event.time || '', updatedPlace.day || 1, arrivalTime || '', updatedPlace.endDay || updatedPlace.day || 1, departureTime || '')

                          return (
                            <div className="flex items-center gap-2">
                              {isMulti && <span className="text-primary font-bold mr-1">D{start}</span>}
                              {formatTime(event.time || '', timeFormat)}
                              {event.endTime && (
                                <>
                                  <span className="mx-1 opacity-50">→</span>
                                  {isMulti && <span className="text-primary font-bold mr-1">D{end}</span>}
                                  {formatTime(event.endTime, timeFormat)}
                                </>
                              )}
                              {isOutOfBounds && (
                                <span className="material-symbols-outlined text-red-400 text-xs ml-1 animate-pulse" title="Time is outside place bounds">warning</span>
                              )}
                            </div>
                          )
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </FormListItem>
            ))}
            {isEditMode && !updatedPlace.events?.length && (
              <p className="text-neutral-200/40 text-[10px] font-bold text-center py-2">No activities added</p>
            )}
          </div>
        </div>
      )}

      {/* 6. Documents */}
      {(isEditMode || (updatedPlace.documents?.length || 0) > 0) && (
        <div className="space-y-4 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <FormLabel variant="primary" className="flex items-center gap-2 !mb-0">
              <span className="material-symbols-outlined text-base">folder_open</span> Documents
            </FormLabel>
            {isEditMode && (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => handleAddAttachment('document')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-blue-400 bg-blue-400/10 border border-blue-400/20 hover:bg-blue-400/20 transition-colors cursor-pointer"
                  title="Add File"
                >
                  <span className="material-symbols-outlined text-xs">upload_file</span>
                  <span>Add File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInlineLinkInput(!inlineLinkInput)
                    setInlineLinkUrl('')
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                    inlineLinkInput 
                      ? 'text-rose-400 bg-rose-400/10 border-rose-400/20 hover:bg-rose-400/20' 
                      : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/20'
                  }`}
                  title="Add Document Link (Google Drive, public PDF, etc.)"
                >
                  <span className="material-symbols-outlined text-xs">{inlineLinkInput ? 'close' : 'link'}</span>
                  <span>{inlineLinkInput ? 'Cancel' : 'Add Link'}</span>
                </button>
              </div>
            )}
          </div>
          {inlineLinkInput && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-neutral-400">link</span>
                <input
                  type="text"
                  value={inlineLinkUrl}
                  onChange={(e) => setInlineLinkUrl(e.target.value)}
                  placeholder="Paste Google Drive, PDF, Doc, or Sheet link..."
                  className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none placeholder-white/30"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveInlineLink()
                    } else if (e.key === 'Escape') {
                      setInlineLinkInput(false)
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-neutral-400">💡 Instant preview & badge generated</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInlineLinkInput(false)}
                    className="text-neutral-400 hover:text-white transition-colors px-2 py-1 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInlineLink}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold px-3 py-1 rounded-md transition-all shadow-md cursor-pointer"
                  >
                    Add Link
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {updatedPlace.documents?.map((doc, idx) => {
              const info = getDocumentIconAndBadge(doc.url, doc.file)
              return (
                <FormListItem 
                  key={doc.id || `doc-${idx}`} 
                  onDelete={isEditMode ? () => handleDeleteDocument(doc.id) : undefined} 
                  className={`border-l-4 ${info.border} ${info.bg}`} 
                  onClick={() => setAttachmentDetail({ type: 'document', document: doc })}
                >
                  <div className="flex items-center gap-3 w-full p-1">
                    <span className={`${info.color} material-symbols-outlined text-base shrink-0`}>{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold truncate">{doc.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${info.bg} ${info.color} border ${info.border}`}>
                          {info.label}
                        </span>
                        {doc.url && (
                          <span className="text-neutral-400 text-[8px] truncate max-w-[150px] font-medium opacity-60">
                            {doc.url.replace(/^https?:\/\/(www\.)?/, '')}
                          </span>
                        )}
                      </div>
                    </div>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all shrink-0 flex items-center justify-center border border-transparent hover:border-white/10"
                        title="Open Document Link"
                      >
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    )}
                  </div>
                </FormListItem>
              )
            })}
            {isEditMode && !updatedPlace.documents?.length && (
              <p className="text-neutral-200/40 text-[10px] font-bold text-center py-2">No documents added</p>
            )}
          </div>
        </div>
      )}

      {/* 7. URLs & Links */}
      {(isEditMode || (updatedPlace.links?.length || 0) > 0) && (
        <div className="space-y-4 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <FormLabel variant="primary" className="flex items-center gap-2 !mb-0">
              <span className="material-symbols-outlined text-base">link</span> URLs & Links
            </FormLabel>
            {isEditMode && (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => handleAddAttachment('link')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 hover:bg-cyan-400/20 transition-colors"
                  title="Add URL"
                >
                  <span className="material-symbols-outlined text-xs">add</span>
                  <span className="material-symbols-outlined text-xs text-cyan-400">link</span>
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {updatedPlace.links?.map((link, idx) => (
              <FormListItem key={link.id || `link-${idx}`} onDelete={isEditMode ? () => handleDeleteLink(link.id) : undefined} className="border-cyan-400/20" onClick={() => setAttachmentDetail({ type: 'link', link })}>
                <div className="flex items-center gap-3 w-full p-1">
                  <span className="text-cyan-400 material-symbols-outlined text-base">link</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate">{link.title || link.url}</p>
                  </div>
                </div>
              </FormListItem>
            ))}
            {isEditMode && !updatedPlace.links?.length && (
              <p className="text-neutral-200/40 text-[10px] font-bold text-center py-2">No links added</p>
            )}
          </div>
        </div>
      )}

      {/* 8. Transport Section */}
      {(() => {
        const globalIndex = allPlaces.findIndex(p => p.id === place.id);
        if (globalIndex === -1) return null;
        const inboundSource = globalIndex === 0 ? place : allPlaces[globalIndex - 1];
        const inboundLegs = inboundSource.transport?.filter(t => t.to === place.id) || [];
        const outboundLegs = updatedPlace.transport?.filter(t => t.from === place.id) || [];
        const hasTransport = inboundLegs.length > 0 || outboundLegs.length > 0;
        
        if (!isEditMode && !hasTransport) return null;

        return (
          <div className="space-y-4 pb-8">
            <div className="flex items-center justify-between gap-3 mb-2">
              <FormLabel variant="primary" className="flex items-center gap-2 !mb-0">
                <span className="material-symbols-outlined text-base">commute</span> Transport
              </FormLabel>
              {isEditMode && !isNew && onAddTransport && (
                <button
                  type="button"
                  onClick={handleAddTransport}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors"
                  title="Add Transport"
                >
                  <span className="material-symbols-outlined text-xs">add</span>
                  <span className="material-symbols-outlined text-xs text-emerald-400">commute</span>
                </button>
              )}
            </div>
            <div className="space-y-3">
              {inboundLegs.map((leg, idx) => (
                <div key={`inbound-${leg.id || idx}`} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all" onClick={() => onOpenTransport(leg, inboundSource.name, place.name)}>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">login</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/40 font-bold truncate">Arrival from {inboundSource.name}</p>
                      <p className="text-xs text-white font-medium truncate">{leg.type} • {leg.arrival}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 relative w-6 h-6 flex-shrink-0">
                    <span className={`material-symbols-outlined absolute inset-0 flex items-center justify-center text-white/20 transition-all ${isEditMode ? 'group-hover:opacity-0 group-hover:scale-75' : 'group-hover:text-primary'}`}>chevron_right</span>
                    {isEditMode && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteTransport(leg.id, inboundSource.id); }}
                        className="absolute inset-0 flex items-center justify-center text-neutral-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 group-hover:scale-110"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {outboundLegs.map((leg, idx) => {
                const destination = allPlaces.find(p => p.id === leg.to);
                return (
                  <div key={`outbound-${leg.id || idx}`} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all" onClick={() => onOpenTransport(leg, place.name, destination?.name || 'Unknown')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-green-400 shrink-0">logout</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/40 font-bold truncate">Departure to {destination?.name || 'Next'}</p>
                        <p className="text-xs text-white font-medium truncate">{leg.type} • {leg.departure}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 relative w-6 h-6 flex-shrink-0">
                      <span className={`material-symbols-outlined absolute inset-0 flex items-center justify-center text-white/20 transition-all ${isEditMode ? 'group-hover:opacity-0 group-hover:scale-75' : 'group-hover:text-green-400'}`}>chevron_right</span>
                      {isEditMode && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteTransport(leg.id, place.id); }}
                          className="absolute inset-0 flex items-center justify-center text-neutral-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 group-hover:scale-110"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {isEditMode && !inboundLegs.length && !outboundLegs.length && (
                <p key="no-transport" className="text-neutral-500 text-[10px] font-bold text-center py-2 opacity-40">No transport recorded</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  )

  const rightColumnContent = (
    <div className="h-full bg-neutral-900 relative">
      <MapPreview
        className="w-full h-full"
        places={allPlaces}
        focusedPlaceId={place.id}
        showDayNumbers={true}
        showControls={true}
        mapStyle={mapStyle}
        onMarkerClick={(p) => {
          if (p.id === place.id) return;
          onOpenPlace(p);
        }}
        onMapClick={onMapClick}
      />
    </div>
  )

  // --- 6. Main Render ---
  return (
    <>
      <BaseDetailModal
        isOpen={true}
        onClose={onClose}
        isEditMode={isEditMode}
        title={isEditMode ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={updatedPlace.name}
              onChange={(e) => commitPlaceUpdate({ ...updatedPlace, name: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 text-xl font-bold text-white focus:border-primary focus:outline-none transition-all w-full max-w-md"
              placeholder="Place name..."
              autoFocus
            />
            <button
              type="button"
              onClick={handleMagicFetch}
              disabled={isFetchingInfo || !updatedPlace.name || updatedPlace.name.length < 3}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-30 shrink-0"
              title="Auto-fetch details & images"
            >
              {isFetchingInfo ? (
                <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
              )}
              <span className="hidden sm:inline">Discovery</span>
            </button>
          </div>
        ) : updatedPlace.name}
        subtitle={updatedPlace.type ? (updatedPlace.type.charAt(0).toUpperCase() + updatedPlace.type.slice(1).replace(/_/g, ' ') + (updatedPlace.location ? ` • ${updatedPlace.location}` : '')) : (updatedPlace.location || (isNew ? "Set details for your new destination" : "No address set"))}
        icon="location_on"
        iconColor="text-primary"
        actions={isEditMode && onEditLocation ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditLocation}
            className="text-xs font-bold text-primary/60 hover:text-primary hover:bg-primary/10 px-3 h-8 border border-primary/20 rounded-xl"
            icon="edit_location_alt"
          >
            Change Location
          </Button>
        ) : null}
        leftColumn={leftColumnContent}
        rightColumn={rightColumnContent}
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            {isEditMode && onDelete ? (
              <Button
                variant="modal-danger"
                icon="delete"
                onClick={() => setDeleteConfirm({
                  isOpen: true,
                  title: 'Delete Place?',
                  message: `Are you sure you want to delete "${updatedPlace.name}"? This will also delete all associated accommodations, events, and transport legs.`,
                  onConfirm: () => {
                    onDelete?.();
                    onClose();
                  }
                })}
              >
                Delete
              </Button>
            ) : null}
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
                   <Button variant="modal-primary" icon="check_circle" onClick={() => {
                    if (validateAndSave(updatedPlace)) {
                      if (isNew) onSave(updatedPlace)
                      onClose()
                      setIsEditMode(false)
                    }
                  }}>Save Changes</Button>
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

      {attachmentDetail && (
        <AttachmentDetailModal
          data={attachmentDetail}
          isEditMode={isEditMode}
          placeId={updatedPlace.id}
          placeName={updatedPlace.name}
          placeCoords={updatedPlace.lat && updatedPlace.lng ? { lat: updatedPlace.lat, lng: updatedPlace.lng } : undefined}
          placeStartDay={updatedPlace.day || 1}
          placeEndDay={updatedPlace.endDay || updatedPlace.day || 1}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          totalDays={allDaysCount}
          mapStyle={mapStyle}
          allPlaces={allPlaces}
          placeArrivalTime={arrivalTime}
          placeDepartureTime={departureTime}
          onClose={() => setAttachmentDetail(null)}
          onDelete={() => {
            if (attachmentDetail.type === 'event' && attachmentDetail.event) handleDeleteEvent(attachmentDetail.event.id)
            else if (attachmentDetail.type === 'accommodation' && attachmentDetail.accommodation) handleDeleteAccommodation(attachmentDetail.accommodation.id)
            else if (attachmentDetail.type === 'document' && attachmentDetail.document) handleDeleteDocument(attachmentDetail.document.id)
            else if (attachmentDetail.type === 'link' && attachmentDetail.link) handleDeleteLink(attachmentDetail.link.id)
            setAttachmentDetail(null)
          }}
          onSave={(updated) => {
            let newPlace = updatedPlace
            if (updated.type === 'event' && updated.event) {
              newPlace = { ...updatedPlace, events: updatedPlace.events?.map(e => e.id === updated.event!.id ? updated.event! : e) || [] }
            } else if (updated.type === 'accommodation' && updated.accommodation) {
              newPlace = { ...updatedPlace, accommodations: updatedPlace.accommodations?.map(a => a.id === updated.accommodation!.id ? updated.accommodation! : a) || [] }
            } else if (updated.type === 'document' && updated.document) {
              newPlace = { ...updatedPlace, documents: updatedPlace.documents?.map(d => d.id === updated.document!.id ? updated.document! : d) || [] }
            } else if (updated.type === 'link' && updated.link) {
              newPlace = { ...updatedPlace, links: updatedPlace.links?.map(l => l.id === updated.link!.id ? updated.link! : l) || [] }
            }
            setUpdatedPlace(newPlace)
            if (!isNew) onSave(newPlace)
            setAttachmentDetail(null)
          }}
        />
      )}

      {isImageSearchOpen && (
        <ModalBackdrop onClick={() => setIsImageSearchOpen(false)}>
          <ModalContainer size="lg">
            <ModalHeader 
              title="Search Photos" 
              subtitle={`Finding images for ${updatedPlace.name}`}
              onClose={() => setIsImageSearchOpen(false)}
            />
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <div className="relative">
                <input
                  ref={imageSearchInputRef}
                  type="text"
                  value={imageSearchQuery}
                  onChange={(e) => setImageSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImageSearch(imageSearchQuery)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-white placeholder-neutral-500 outline-none focus:border-primary/50 text-sm transition-all"
                  placeholder="Search for photos..."
                />
                <button onClick={() => handleImageSearch(imageSearchQuery)} className="absolute right-3 top-2.5 text-neutral-500 hover:text-white">
                  <span className="material-symbols-outlined text-xs">{isImageSearching ? 'refresh' : 'search'}</span>
                </button>
              </div>
            </div>
            <ModalContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imageSearchResults.map((url, index) => {
                  const isSelected = updatedPlace.photos?.includes(url)
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        const isRemoving = isSelected;
                        const newPhotos = isRemoving 
                          ? updatedPlace.photos?.filter(p => p !== url) 
                          : [...(updatedPlace.photos || []), url]
                        
                        const newPhotoDays = isRemoving
                          ? (updatedPlace.photoDays || []).filter((_, i) => updatedPlace.photos?.[i] !== url)
                          : [...(updatedPlace.photoDays || []), currentMediaDay]

                        const updated = { ...updatedPlace, photos: newPhotos, photoDays: newPhotoDays }
                        setUpdatedPlace(updated)
                        if (!isNew) onSave(updated)
                      }}
                      className={`relative aspect-video rounded-xl border transition-all ${
                        isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-white/10 hover:scale-105'
                      } overflow-hidden group`}
                    >
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <span className="material-symbols-outlined text-white text-3xl">
                          {isSelected ? 'check_circle' : 'add_circle'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ModalContent>
            <ModalFooter>
              <Button variant="modal-primary" fullWidth onClick={() => setIsImageSearchOpen(false)}>Done</Button>
            </ModalFooter>
          </ModalContainer>
        </ModalBackdrop>
      )}

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={() => {
          deleteConfirm.onConfirm()
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }))
        }}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
