'use client'

import { useState, useEffect } from 'react'
import TimePicker from '@/components/TimePicker'
import { normalizeUrl } from '@/lib/storage'
import { searchWallpapers } from '@/lib/wallpaper-search'
import { getDayWithDate } from '@/lib/date-utils'
import {
  ModalBackdrop,
  ModalContainer,
  ModalHeader,
  ModalFooter,
  ModalContent,
} from '@/components/ModalLayout'
import LocationPickerModal from '@/components/LocationPickerModal'
import { Button } from '@/components/Button'
import { FormInput, FormSelect, FormTextarea, FormGrid, FormGroup, FormLabel } from '@/components/FormLayout'
import Map from '@/components/Map'
import { getIconForType } from '@/lib/discovery'

// ─── Types ────────────────────────────────────────────────────────────────────
export type AttachmentType = 'note' | 'event' | 'document' | 'link' | 'accommodation'

interface AttachmentModalProps {
  type: AttachmentType
  placeId?: string
  placeName?: string
  allPlaces?: any[]
  initialNote?: string
  startDay?: number
  endDay?: number
  defaultDay?: number
  defaultTime?: string
  tripStartDate?: string
  placeCoords?: { lat: number; lng: number }
  mapStyle?: string
  timeFormat?: '12h' | '24h'
  onClose: () => void
  onSave: (payload: AttachmentPayload) => void
}

export interface AttachmentPayload {
  type: AttachmentType
  day?: number
  eventEndDay?: number
  note?: string
  eventTitle?: string
  eventDescription?: string
  eventTime?: string
  eventEndTime?: string
  eventLocation?: string
  docName?: string
  docUrl?: string
  docFile?: string
  docMimeType?: string
  photos?: string[]
  linkTitle?: string
  linkUrl?: string
  accName?: string
  accType?: 'hotel' | 'airbnb' | 'hostel' | 'other'
  accCheckIn?: string
  accCheckInDay?: number
  accCheckOut?: string
  accCheckOutDay?: number
  accLink?: string
  accLocation?: string
  accDescription?: string
  lat?: number
  lng?: number
  icon?: string
}

// ─── Config per type ─────────────────────────────────────────────────────────
const CONFIG: Record<AttachmentType, { title: string; subtitle: string; icon: string; color: string }> = {
  note: {
    title: 'Add Note',
    subtitle: 'Write a note about this place',
    icon: 'sticky_note_2',
    color: 'text-amber-400',
  },
  event: {
    title: 'Add Activity',
    subtitle: 'Log an activity or experience at this place',
    icon: 'flag',
    color: 'text-red-400',
  },
  document: {
    title: 'Add Document',
    subtitle: 'Attach a booking, ticket, or file reference',
    icon: 'description',
    color: 'text-blue-400',
  },
  link: {
    title: 'Add Link',
    subtitle: 'Attach a website or URL',
    icon: 'link',
    color: 'text-cyan-400',
  },
  accommodation: {
    title: 'Add Accommodation',
    subtitle: 'Log a stay at this place',
    icon: 'bed',
    color: 'text-yellow-400',
  },
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AttachmentModal({ 
  type, 
  placeId,
  placeName, 
  allPlaces = [],
  initialNote = '', 
  startDay = 1, 
  endDay = 1, 
  defaultDay, 
  defaultTime, 
  tripStartDate = '', 
  placeCoords,
  mapStyle, 
  timeFormat = '12h',
  onClose, 
  onSave 
}: AttachmentModalProps) {
  const cfg = CONFIG[type]

  const [selectedDay, setSelectedDay] = useState<number>(defaultDay || startDay)
  const [note, setNote] = useState(initialNote)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventTime, setEventTime] = useState(defaultTime || '')
  const [eventEndTime, setEventEndTime] = useState('')
  const [eventEndDay, setEventEndDay] = useState<number>(defaultDay || startDay)
  const [eventPhotos, setEventPhotos] = useState<string[]>([])
  const [eventLocation, setEventLocation] = useState('')
  const [eventLink, setEventLink] = useState('')

  const [docName, setDocName] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docFile, setDocFile] = useState<string | undefined>()
  const [docMimeType, setDocMimeType] = useState<string | undefined>()

  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')

  const [accName, setAccName] = useState('')
  const [accType, setAccType] = useState<'hotel' | 'airbnb' | 'hostel' | 'other'>('hotel')
  const [accCheckIn, setAccCheckIn] = useState('')
  const [accCheckInDay, setAccCheckInDay] = useState<number>(defaultDay || startDay)
  const [accCheckOut, setAccCheckOut] = useState('')
  const [accCheckOutDay, setAccCheckOutDay] = useState<number>(defaultDay || startDay)
  const [accLocation, setAccLocation] = useState('')
  const [accDescription, setAccDescription] = useState('')
  const [accLink, setAccLink] = useState('')
  const [accPhotos, setAccPhotos] = useState<string[]>([])

  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedIcon, setSelectedIcon] = useState<string>('location_on')
  const [isSearchingModalOpen, setIsSearchingModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const dayOptions = Array.from(
    { length: (endDay || startDay) - startDay + 1 },
    (_, i) => ({ value: startDay + i, label: getDayWithDate(tripStartDate, startDay + i) })
  )

  const handleSearch = async (q: string) => {
    if (!q.trim()) return
    setIsSearching(true)
    try {
      const results = await searchWallpapers(q)
      setSearchResults(results)
    } catch (e) { console.error(e) }
    finally { setIsSearching(false) }
  }

  const handleSave = () => {
    onSave({
      type,
      day: selectedDay,
      eventEndDay: type === 'event' ? eventEndDay : selectedDay,
      eventTitle: eventTitle.trim(),
      eventDescription: eventDescription.trim(),
      eventTime: eventTime.trim(),
      eventEndTime: eventEndTime.trim(),
      eventLocation: eventLocation.trim(),
      docName: docName.trim(),
      docUrl: docUrl.trim(),
      docFile: docFile,
      docMimeType: docMimeType,
      linkUrl: normalizeUrl(linkUrl),
      linkTitle: linkTitle.trim(),
      accName: accName.trim(),
      accType: accType,
      accCheckIn: accCheckIn,
      accCheckInDay: accCheckInDay,
      accCheckOut: accCheckOut,
      accCheckOutDay: accCheckOutDay,
      accLocation: accLocation.trim(),
      accDescription: accDescription.trim(),
      accLink: accLink.trim(),
      photos: type === 'accommodation' ? accPhotos : eventPhotos,
      lat: selectedCoords?.lat,
      lng: selectedCoords?.lng,
      icon: selectedIcon,
    })
    onClose()
  }

  const isValid = () => {
    if (type === 'event') return eventTitle.trim().length > 0
    if (type === 'document') return docName.trim().length > 0 && (docUrl.trim().length > 0 || docFile != null)
    if (type === 'link') return linkUrl.trim().length > 0
    if (type === 'accommodation') return accName.trim().length > 0
    if (type === 'note') return note.trim().length > 0
    return false
  }

  return (
    <>
      <ModalBackdrop onClick={onClose}>
        <ModalContainer size="lg" className="max-h-[85vh] flex flex-col">
          <ModalHeader
            title={cfg.title}
            subtitle={placeName}
            onClose={onClose}
            icon={cfg.icon}
            iconColor={cfg.color}
          />

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left Column - Form */}
            <div className="flex-1 md:flex-[0.5] overflow-y-auto custom-scrollbar p-4 bg-white/[0.02]">
              <div className="space-y-4">
                
                {/* ── NOTE ── */}
                {type === 'note' && (
                  <FormTextarea
                    label="Note Content"
                    labelVariant="secondary"
                    className="h-64"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    autoFocus
                  />
                )}

                {/* ── EVENT ── */}
                {type === 'event' && (
                  <div className="space-y-4">
                    <FormInput
                      label="Event Title"
                      labelVariant="secondary"
                      value={eventTitle}
                      onChange={e => setEventTitle(e.target.value)}
                      autoFocus
                    />
                    
                    <FormInput
                      label="Location"
                      labelVariant="secondary"
                      value={eventLocation}
                      placeholder="Search for a location..."
                      onFocus={() => setIsLocationPickerOpen(true)}
                      className="cursor-pointer"
                      readOnly
                    />

                    <div className="space-y-2">
                      <FormLabel variant="secondary">Media ({eventPhotos.length})</FormLabel>
                      <div className="grid grid-cols-3 gap-3">
                        {eventPhotos.map((photo, i) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/10 relative group">
                            <img src={photo} className="w-full h-full object-cover" alt="" />
                            <button onClick={() => setEventPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          </div>
                        ))}
                        <button onClick={() => setIsSearchingModalOpen(true)} className="aspect-square rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 transition-all">
                          <span className="material-symbols-outlined">search</span>
                          <span className="text-xs font-bold mt-1">Add Media</span>
                        </button>
                      </div>
                    </div>

                    <FormTextarea
                      label="Description"
                      labelVariant="secondary"
                      value={eventDescription}
                      onChange={e => setEventDescription(e.target.value)}
                      className="h-24"
                    />

                    <div className="space-y-4">
                      <FormLabel variant="secondary">Timing</FormLabel>
                      <FormGrid columns={2}>
                        <FormGroup>
                          <FormSelect
                            label="Start Day"
                            labelVariant="secondary"
                            value={selectedDay}
                            options={dayOptions}
                            onChange={e => {
                              const d = parseInt(e.target.value)
                              setSelectedDay(d)
                              if (eventEndDay < d) setEventEndDay(d)
                            }}
                          />
                          <div className="space-y-1">
                            <FormLabel variant="secondary">Start Time</FormLabel>
                            <TimePicker value={eventTime} onChange={setEventTime} timeFormat={timeFormat} />
                          </div>
                        </FormGroup>
                        <FormGroup>
                          <FormSelect
                            label="End Day"
                            labelVariant="secondary"
                            value={eventEndDay}
                            options={dayOptions}
                            onChange={e => setEventEndDay(parseInt(e.target.value))}
                          />
                          <div className="space-y-1">
                            <FormLabel variant="secondary">End Time</FormLabel>
                            <TimePicker value={eventEndTime} onChange={setEventEndTime} timeFormat={timeFormat} />
                          </div>
                        </FormGroup>
                      </FormGrid>
                    </div>
                  </div>
                )}

                {/* ── ACCOMMODATION ── */}
                {type === 'accommodation' && (
                  <div className="space-y-4">
                    <FormGrid columns={2}>
                      <FormInput
                        label="Name"
                        labelVariant="secondary"
                        value={accName}
                        onChange={e => setAccName(e.target.value)}
                        autoFocus
                      />
                      <FormSelect
                        label="Type"
                        labelVariant="secondary"
                        value={accType}
                        options={[
                          { value: 'hotel', label: 'Hotel' },
                          { value: 'airbnb', label: 'Airbnb' },
                          { value: 'hostel', label: 'Hostel' },
                          { value: 'other', label: 'Other' }
                        ]}
                        onChange={e => setAccType(e.target.value as any)}
                      />
                    </FormGrid>

                    <FormInput
                      label="Location"
                      labelVariant="secondary"
                      value={accLocation}
                      placeholder="Search for a location..."
                      onFocus={() => setIsLocationPickerOpen(true)}
                      className="cursor-pointer"
                      readOnly
                    />

                    <div className="space-y-2">
                      <FormLabel variant="secondary">Media ({accPhotos.length})</FormLabel>
                      <div className="grid grid-cols-3 gap-3">
                        {accPhotos.map((photo, i) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/10 relative group">
                            <img src={photo} className="w-full h-full object-cover" alt="" />
                            <button onClick={() => setAccPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          </div>
                        ))}
                        <button onClick={() => setIsSearchingModalOpen(true)} className="aspect-square rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 transition-all">
                          <span className="material-symbols-outlined">search</span>
                          <span className="text-xs font-bold mt-1">Add Media</span>
                        </button>
                      </div>
                    </div>

                    <FormTextarea
                      label="Description"
                      labelVariant="secondary"
                      value={accDescription}
                      onChange={e => setAccDescription(e.target.value)}
                      className="h-24"
                    />

                    <div className="space-y-4">
                      <FormLabel variant="secondary">Timing</FormLabel>
                      <FormGrid columns={2}>
                        <FormGroup>
                          <FormSelect
                            label="Check-in Day"
                            labelVariant="secondary"
                            value={accCheckInDay}
                            options={dayOptions}
                            onChange={e => {
                              const d = parseInt(e.target.value)
                              setAccCheckInDay(d)
                              if (accCheckOutDay < d) setAccCheckOutDay(d)
                            }}
                          />
                          <div className="space-y-1">
                            <FormLabel variant="secondary">Check-in Time</FormLabel>
                            <TimePicker value={accCheckIn} onChange={setAccCheckIn} timeFormat={timeFormat} />
                          </div>
                        </FormGroup>
                        <FormGroup>
                          <FormSelect
                            label="Check-out Day"
                            labelVariant="secondary"
                            value={accCheckOutDay}
                            options={dayOptions}
                            onChange={e => setAccCheckOutDay(parseInt(e.target.value))}
                          />
                          <div className="space-y-1">
                            <FormLabel variant="secondary">Check-out Time</FormLabel>
                            <TimePicker value={accCheckOut} onChange={setAccCheckOut} timeFormat={timeFormat} />
                          </div>
                        </FormGroup>
                      </FormGrid>
                    </div>
                  </div>
                )}

                {/* ── DOCUMENT ── */}
                {type === 'document' && (
                  <div className="space-y-4">
                    <FormInput
                      label="Document Name"
                      labelVariant="secondary"
                      value={docName}
                      onChange={e => setDocName(e.target.value)}
                      autoFocus
                    />
                    <FormInput
                      label="URL (Optional)"
                      labelVariant="secondary"
                      value={docUrl}
                      onChange={e => setDocUrl(e.target.value)}
                    />
                    <div className="space-y-2">
                      <FormLabel variant="secondary">Upload File</FormLabel>
                      <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-dashed border-white/20 cursor-pointer hover:bg-white/10 transition-all">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (!docName) setDocName(file.name)
                              setDocMimeType(file.type)
                              const reader = new FileReader()
                              reader.onload = () => setDocFile(reader.result as string)
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                        <span className="material-symbols-outlined text-neutral-500">{docFile ? 'check_circle' : 'upload_file'}</span>
                        <span className="text-sm text-neutral-400 truncate flex-1">{docFile ? 'File attached' : 'Select a file...'}</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* ── LINK ── */}
                {type === 'link' && (
                  <div className="space-y-4">
                    <FormInput
                      label="URL"
                      labelVariant="secondary"
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      autoFocus
                    />
                    <FormInput
                      label="Label (Optional)"
                      labelVariant="secondary"
                      value={linkTitle}
                      onChange={e => setLinkTitle(e.target.value)}
                    />
                  </div>
                )}

              </div>
            </div>

            {/* Right Column - Map */}
            <div className="hidden md:flex md:flex-1 md:flex-[0.5] flex-col p-6 bg-white/5">
              <div className="h-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 relative shadow-2xl">
                {(type === 'accommodation' || type === 'event') ? (
                  <Map
                    className="w-full h-full"
                    places={[
                      ...allPlaces,
                      // Attachment Marker
                      {
                        id: 'preview',
                        name: type === 'accommodation' ? accName : eventTitle,
                        location: type === 'accommodation' ? accLocation : eventLocation,
                        lat: selectedCoords?.lat,
                        lng: selectedCoords?.lng,
                        emoji: type === 'accommodation' ? '🏨' : '🚩'
                      }
                    ].filter(p => p.lat !== undefined && p.lng !== undefined) as any[]}
                    focusedPlaceId={(selectedCoords?.lat != null && selectedCoords?.lng != null) ? 'preview' : (placeId || null)}
                    showDayNumbers={true}
                    showControls={true}
                    mapStyle={mapStyle}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-4 h-full">
                    {docFile && docMimeType?.startsWith('image/') ? (
                      <img src={docFile} className="w-full h-full object-cover" alt="Preview" />
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
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="modal-primary" icon={cfg.icon} disabled={!isValid()} onClick={handleSave}>Add {type}</Button>
          </ModalFooter>
        </ModalContainer>
      </ModalBackdrop>

      {isLocationPickerOpen && (
        <LocationPickerModal
          isOpen={true}
          onClose={() => setIsLocationPickerOpen(false)}
          mapStyle={mapStyle}
          allPlaces={allPlaces}
          focusedPlaceId={placeId}
          onSelect={(loc) => {
            if (type === 'accommodation') {
              setAccName(loc.name)
              setAccLocation(loc.address)
              if (loc.description && !accDescription) setAccDescription(loc.description)
              if (loc.images && loc.images.length > 0 && accPhotos.length === 0) setAccPhotos(loc.images)
            } else if (type === 'event') {
              setEventLocation(loc.address)
              if (loc.description && !eventDescription) setEventDescription(loc.description)
              if (loc.images && loc.images.length > 0 && eventPhotos.length === 0) setEventPhotos(loc.images)
            }
            if (loc.type) setSelectedIcon(getIconForType(loc.type))
            setSelectedCoords({ lat: loc.lat, lng: loc.lng })
            setIsLocationPickerOpen(false)
          }}
        />
      )}

      {isSearchingModalOpen && (
        <ModalBackdrop onClick={() => setIsSearchingModalOpen(false)}>
          <ModalContainer size="sm">
            <ModalHeader 
              title="Search Photos" 
              subtitle="Find images for your entry"
              onClose={() => setIsSearchingModalOpen(false)}
            />
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <div className="relative">
                <input
                  autoFocus
                  placeholder="Search for photos..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-primary/50 transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery)}
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">search</span>
              </div>
            </div>
            <ModalContent className="p-4">
              {isSearching ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {searchResults.map((photo: string, i: number) => {
                    const currentPhotos = type === 'accommodation' ? accPhotos : eventPhotos
                    const isSelected = currentPhotos.includes(photo)
                    return (
                      <div 
                        key={i} 
                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all border ${
                          isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-white/5 bg-white/5 hover:opacity-80'
                        }`}
                        onClick={() => {
                          const setter = type === 'accommodation' ? setAccPhotos : setEventPhotos;
                          if (isSelected) {
                            setter(prev => prev.filter(p => p !== photo))
                          } else {
                            setter(prev => [...prev, photo]);
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
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-neutral-500 gap-2 opacity-50">
                  <span className="material-symbols-outlined text-3xl">image_search</span>
                  <p className="text-xs font-bold">Search for photos</p>
                </div>
              )}
            </ModalContent>
            <ModalFooter>
              <Button variant="modal-primary" fullWidth onClick={() => setIsSearchingModalOpen(false)}>Done</Button>
            </ModalFooter>
          </ModalContainer>
        </ModalBackdrop>
      )}
    </>
  )
}
