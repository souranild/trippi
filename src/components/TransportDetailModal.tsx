'use client'

import React, { useState, useMemo } from 'react'
import { Transport, TransportMode, Document, Note, Link } from '@/lib/storage'
import { DateTimeSelector } from '@/components/DateTimeSelector'
import { getDayWithDate } from '@/lib/date-utils'
import {
  BaseDetailModal
} from '@/components/ModalLayout'
import { Button } from '@/components/Button'
import { FormInput, FormLabel, FormListItem, FormGrid } from '@/components/FormLayout'
import { ConfirmationModal } from './ConfirmationModal'
import { TRANSPORT_MODES, normalizeTransportMode } from '@/lib/transport-options'
import LocationPickerModal from './LocationPickerModal'
import Map from '@/components/Map'
import AttachmentDetailModal, { AttachmentDetailData } from './AttachmentDetailModal'
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent } from './ModalLayout'
import { calculateDistance, formatDistance } from '@/lib/discovery'
import { ensureHtml } from '@/lib/rich-text-utils'
import { getBoundsError } from '@/lib/itinerary-utils'
import RichTextEditor from '@/components/RichTextEditor'

interface TransportDetailModalProps {
  leg: Transport | null
  fromName: string
  toName: string
  fromId: string
  toId: string
  totalDays?: number
  defaultDay?: number
  isEditMode: boolean
  tripStartDate?: string
  fromCoords?: { lat: number; lng: number }
  toCoords?: { lat: number; lng: number }
  minDay?: number
  minTime?: string
  maxDay?: number
  maxTime?: string
  mapStyle?: string
  distanceUnit?: 'metric' | 'imperial'
  onSave: (leg: Transport) => void
  onDelete?: () => void
  onClose: () => void
  timeFormat?: '12h' | '24h'
}

export default function TransportDetailModal({
  leg,
  fromName,
  toName,
  fromId,
  toId,
  totalDays = 1,
  defaultDay,
  isEditMode: initialEditMode,
  tripStartDate = '',
  fromCoords,
  toCoords,
  minDay,
  minTime,
  maxDay,
  maxTime,
  mapStyle,
  distanceUnit = 'metric',
  onSave,
  onDelete,
  onClose,
  timeFormat = '12h'
}: TransportDetailModalProps) {
  // --- 1. State ---
  const [isEditMode, setIsEditMode] = useState(initialEditMode)
  const [mode, setMode] = useState<TransportMode | null>(
    leg ? normalizeTransportMode(leg.type) : (TRANSPORT_MODES[0].type as TransportMode)
  )
  const [title, setTitle] = useState(leg?.title || '')
  const [departure, setDeparture] = useState(leg?.departure || '')
  const [departureDay, setDepartureDay] = useState<number>(
    leg?.departureDay ?? leg?.arrivalDay ?? (fromId === 'home' && !leg ? 0 : defaultDay ?? 1)
  )
  const [arrival, setArrival] = useState(leg?.arrival || '')
  const [arrivalDay, setArrivalDay] = useState<number>(
    leg?.arrivalDay ?? leg?.departureDay ?? (fromId === 'home' && !leg ? 1 : defaultDay ?? 1)
  )
  const [ticketNumber, setTicketNumber] = useState(leg?.ticketNumber || '')
  const [fromLocation, setFromLocation] = useState(leg?.fromLocation || (fromName === 'home' ? 'Home' : fromName))
  const [toLocation, setToLocation] = useState(leg?.toLocation || (toName === 'home' ? 'Home' : toName))
  const [notes, setNotes] = useState<Note[]>(leg?.notes || [])
  const [links, setLinks] = useState<Link[]>(leg?.links || [])
  
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [pickingFor, setPickingFor] = useState<'from' | 'to' | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [documents, setDocuments] = useState<Document[]>(leg?.documents || [])
  const [attachmentDetail, setAttachmentDetail] = useState<AttachmentDetailData | null>(null)
  
  // Calculated distance from coords
  const autoDistance = useMemo(() => {
    if (fromCoords && toCoords) {
      const distKm = calculateDistance(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng)
      return formatDistance(distKm, distanceUnit)
    }
    return null
  }, [fromCoords, toCoords, distanceUnit])

  const [validationError, setValidationError] = useState<string | null>(null)

  const [distance, setDistance] = useState(leg?.distance || autoDistance || '')

  // --- 2. Derived State ---
  const dayOptions = useMemo(() => {
    const options = []
    // Add 3 days before Day 1 (D-2, D-1, D0)
    for (let i = -2; i <= 0; i++) {
      options.push({
        value: i,
        label: getDayWithDate(tripStartDate, i)
      })
    }
    // Standard trip days
    for (let i = 1; i <= totalDays; i++) {
      options.push({
        value: i,
        label: getDayWithDate(tripStartDate, i)
      })
    }
    // Add 3 days after the last day
    for (let i = totalDays + 1; i <= totalDays + 3; i++) {
      options.push({
        value: i,
        label: getDayWithDate(tripStartDate, i)
      })
    }
    return options
  }, [totalDays, tripStartDate])

  const currentMode = TRANSPORT_MODES.find(m => m.type === mode) || TRANSPORT_MODES[0]

  // --- 3. Handlers ---
  const handleAddDocument = () => {
    setAttachmentDetail({
      type: 'document',
      document: {
        id: Date.now().toString(),
        name: 'New Document',
        type: 'other',
        day: departureDay
      }
    })
  }

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  const handleAttachmentSave = (updated: AttachmentDetailData) => {
    if (updated.type === 'document' && updated.document) {
      setDocuments(prev => {
        const idx = prev.findIndex(d => d.id === updated.document!.id)
        if (idx !== -1) {
          const next = [...prev]
          next[idx] = updated.document!
          return next
        }
        return [...prev, updated.document!]
      })
    }
    else if (updated.type === 'link' && updated.link) {
      setLinks(prev => {
        const idx = prev.findIndex(l => l.id === updated.link!.id)
        if (idx !== -1) {
          const next = [...prev]
          next[idx] = updated.link!
          return next
        }
        return [...prev, updated.link!]
      })
    }
    setAttachmentDetail(null)
  }
  const handleSave = () => {
    if (!mode) return
    
    // Time validation
    const error = getBoundsError(
      departureDay, departure,
      arrivalDay, arrival,
      minDay || 1, minTime || '',
      maxDay || 999, maxTime || '',
      'Transport'
    )
    
    if (error) {
      setValidationError(error)
      return
    }

    const updated: Transport = {
      id: leg?.id ?? Date.now().toString(),
      ...(title.trim() && { title: title.trim() }),
      type: mode,
      from: leg?.from ?? fromId,
      to: leg?.to ?? toId,
      departure,
      departureDay,
      arrival,
      arrivalDay,
      ticketNumber,
      fromLocation,
      toLocation,
      distance,
      photos: [],
      photoDays: [],
      documents: documents,
      notes: notes,
      links: links
    }
    onSave(updated)
    onClose()
  }


  // --- 4. Column Content ---
  const leftColumnContent = (
    <div className="space-y-6">
      {/* Transport Mode */}
      <div className="space-y-2">
        <FormLabel variant="primary">Transport Mode</FormLabel>
        {isEditMode ? (
          <div className="grid grid-cols-4 gap-2">
            {TRANSPORT_MODES.map((m) => (
              <button
                key={m.type}
                type="button"
                onClick={() => setMode(m.type as TransportMode)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
                  mode === m.type
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-white/5 bg-white/5 hover:border-white/20'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${m.color}`}>{m.icon}</span>
                <span className="text-[10px] font-bold text-white/70">{m.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <span className={`material-symbols-outlined text-2xl ${currentMode.color}`}>{currentMode.icon}</span>
            <span className="text-white font-medium">{currentMode.label}</span>
          </div>
        )}
      </div>

      {isEditMode && (
        <FormInput
          label="Title (Optional)"
          labelVariant="primary"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Flight #, Train name..."
        />
      )}

      {validationError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
          <span className="material-symbols-outlined text-red-400 text-base shrink-0">error</span>
          <p className="text-red-200 text-[11px] leading-tight font-medium">{validationError}</p>
        </div>
      )}

      {/* Locations Section */}
      <div className="space-y-4 pb-4 border-b border-white/10">
        <FormGrid columns={2}>
          <div className="space-y-1">
            <FormLabel variant="primary">From Station / Gate</FormLabel>
            <div className="relative group">
              <div 
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm transition-all flex items-center justify-between ${isEditMode ? 'hover:bg-white/10 cursor-pointer' : ''}`} 
                onClick={() => { if (isEditMode) { setPickingFor('from'); setIsLocationPickerOpen(true); } }}
              >
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-neutral-400 text-xs truncate leading-tight mb-0.5">{fromLocation || "No station set"}</p>
                </div>
                {isEditMode && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary/20 text-primary rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <span className="material-symbols-outlined text-sm">edit_location</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <FormLabel variant="primary">To Station / Gate</FormLabel>
            <div className="relative group">
              <div 
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm transition-all flex items-center justify-between ${isEditMode ? 'hover:bg-white/10 cursor-pointer' : ''}`} 
                onClick={() => { if (isEditMode) { setPickingFor('to'); setIsLocationPickerOpen(true); } }}
              >
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-neutral-400 text-xs truncate leading-tight mb-0.5">{toLocation || "No station set"}</p>
                </div>
                {isEditMode && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-cyan-400/20 text-cyan-400 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <span className="material-symbols-outlined text-sm">edit_location</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FormGrid>

        <FormGrid columns={2}>
          <FormInput
            label="Ticket / Confirmation #"
            labelVariant="primary"
            disabled={!isEditMode}
            value={ticketNumber}
            onChange={e => setTicketNumber(e.target.value)}
            placeholder="Booking reference..."
          />
          <FormInput
            label="Distance (Auto-generated)"
            labelVariant="primary"
            disabled={!isEditMode}
            value={distance}
            onChange={e => setDistance(e.target.value)}
            placeholder="Distance..."
          />
        </FormGrid>
      </div>

      {/* Unified Timing Section */}
      <div className="space-y-4">
        <FormLabel variant="primary" className="mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">schedule</span> Timing
        </FormLabel>
        
        <div className="space-y-4">
          <DateTimeSelector
            label="Departure"
            icon="flight_takeoff"
            dayValue={departureDay}
            timeValue={departure}
            dayOptions={dayOptions}
            timeFormat={timeFormat}
            onDayChange={d => {
              setDepartureDay(d)
              if (arrivalDay < d) setArrivalDay(d)
            }}
            onTimeChange={setDeparture}
            disabled={!isEditMode}
          />

          <DateTimeSelector
            label="Arrival"
            icon="flight_land"
            dayValue={arrivalDay}
            timeValue={arrival}
            dayOptions={dayOptions}
            timeFormat={timeFormat}
            onDayChange={setArrivalDay}
            onTimeChange={setArrival}
            disabled={!isEditMode}
          />
        </div>
      </div>

      {/* Documents Section */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-3 mb-2">
          <FormLabel variant="primary" className="flex items-center gap-2 !mb-0">
            <span className="material-symbols-outlined text-base">folder_open</span> Documents
          </FormLabel>
          {isEditMode && (
            <button
              type="button"
              onClick={handleAddDocument}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-blue-400 bg-blue-400/10 border border-blue-400/20 hover:bg-blue-400/20 transition-colors"
              title="Add Document"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              <span className="material-symbols-outlined text-xs text-blue-400">description</span>
            </button>
          )}
        </div>
        <div className="space-y-2">
          {documents.map((doc, idx) => (
            <FormListItem 
              key={doc.id || `doc-${idx}`} 
              onDelete={isEditMode ? () => handleDeleteDocument(doc.id) : undefined} 
              className="border-blue-400/20"
              onClick={() => setAttachmentDetail({ type: 'document', document: doc })}
            >
              <div className="flex items-center gap-3 w-full p-1">
                <span className="text-blue-400 material-symbols-outlined text-base">description</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold truncate">{doc.name}</p>
                  <p className="text-blue-400/60 text-[10px]">{doc.type}</p>
                </div>
              </div>
            </FormListItem>
          ))}
          {!documents.length && (
            <p className="text-neutral-500 text-[10px] font-bold text-center py-2 opacity-40">No documents added</p>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-3 mb-2">
          <FormLabel variant="primary" className="flex items-center gap-2 !mb-0">
            <span className="material-symbols-outlined text-base">sticky_note_2</span> Notes
          </FormLabel>
          {isEditMode && (
            <button
              type="button"
              onClick={() => {
                const newNote: Note = { id: Date.now().toString(), day: departureDay, text: '' }
                setNotes(prev => [...prev, newNote])
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/20 transition-colors"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              <span className="material-symbols-outlined text-xs text-amber-400">sticky_note_2</span>
            </button>
          )}
        </div>
        <div className="space-y-3">
          {notes.map((note, idx) => (
            <div key={note.id || `note-${idx}`} className="space-y-2">
              {isEditMode ? (
                <div className="bg-black/20 rounded-xl p-3 border border-white/10 relative group">
                  <RichTextEditor
                    content={ensureHtml(note.text)}
                    onChange={val => setNotes(prev => prev.map(n => n.id === note.id ? { ...n, text: val } : n))}
                    showToolbar={true}
                  />
                  <button 
                    onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-neutral-200 text-sm whitespace-pre-wrap">{note.text || 'No content'}</p>
                </div>
              )}
            </div>
          ))}
          {!notes.length && (
            <p className="text-neutral-500 text-[10px] font-bold text-center py-2 opacity-40">No notes added</p>
          )}
        </div>
      </div>

      {/* Links Section */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-3 mb-2">
          <FormLabel variant="primary" className="flex items-center gap-2 !mb-0">
            <span className="material-symbols-outlined text-base">link</span> Links
          </FormLabel>
          {isEditMode && (
            <button
              type="button"
              onClick={() => {
                setAttachmentDetail({
                  type: 'link',
                  link: {
                    id: Date.now().toString(),
                    title: 'New Link',
                    url: '',
                    day: departureDay
                  }
                })
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 hover:bg-cyan-400/20 transition-colors"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              <span className="material-symbols-outlined text-xs text-cyan-400">link</span>
            </button>
          )}
        </div>
        <div className="space-y-2">
          {links.map((link, idx) => (
            <FormListItem 
              key={link.id || `link-${idx}`} 
              onDelete={isEditMode ? () => setLinks(prev => prev.filter(l => l.id !== link.id)) : undefined} 
              className="border-cyan-400/20"
              onClick={() => setAttachmentDetail({ type: 'link', link })}
            >
              <div className="flex items-center gap-3 w-full p-1">
                <span className="text-cyan-400 material-symbols-outlined text-base">link</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold truncate">{link.title || link.url}</p>
                  <p className="text-cyan-400/60 text-[10px] truncate">{link.url}</p>
                </div>
              </div>
            </FormListItem>
          ))}
          {!links.length && (
            <p className="text-neutral-500 text-[10px] font-bold text-center py-2 opacity-40">No links added</p>
          )}
        </div>
      </div>
    </div>
  )

  const rightColumnContent = (
    <div className="h-full bg-neutral-900 relative">
      <Map
        className="w-full h-full"
        places={[
          ...(fromCoords ? [{
            id: 'from',
            name: fromName,
            location: fromLocation,
            lat: fromCoords.lat,
            lng: fromCoords.lng,
            emoji: '🏁'
          }] : []),
          ...(toCoords ? [{
            id: 'to',
            name: toName,
            location: toLocation,
            lat: toCoords.lat,
            lng: toCoords.lng,
            emoji: '🏁'
          }] : [])
        ].filter(p => p.lat !== undefined && p.lng !== undefined) as any[]}
        focusedPlaceId={null}
        showDayNumbers={false}
        showControls={true}
        mapStyle={mapStyle}
      />
    </div>
  )

  // --- Calculate Distance ---
  const calculatedDistance = useMemo(() => {
    if (fromCoords && toCoords) {
      const distKm = calculateDistance(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng)
      return formatDistance(distKm, distanceUnit)
    }
    return null
  }, [fromCoords, toCoords, distanceUnit])

  // --- 5. Main Render ---
  return (
    <>
      <BaseDetailModal
        isOpen={true}
        onClose={onClose}
        isEditMode={isEditMode}
        title={isEditMode ? 'Edit Transport' : (title || currentMode.label)}
        subtitle={`${fromName} → ${toName}${distance ? ` • ${distance}` : ''}`}
        icon={currentMode.icon}
        iconColor={currentMode.color}
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
                  <Button variant="modal-primary" icon="save" onClick={handleSave}>Save Route</Button>
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
                    title="Edit Route"
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

      {isLocationPickerOpen && (
        <LocationPickerModal
          isOpen={true}
          onClose={() => { setIsLocationPickerOpen(false); setPickingFor(null); }}
          initialValue={pickingFor === 'from' ? fromLocation || fromName : toLocation || toName}
          mapStyle={mapStyle}
          onSelect={(loc) => {
            if (pickingFor === 'from') setFromLocation(loc.name);
            else if (pickingFor === 'to') setToLocation(loc.name);
            setIsLocationPickerOpen(false);
            setPickingFor(null);
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmationModal
          isOpen={true}
          title="Delete Transport?"
          message={`Are you sure you want to delete this ${mode || 'transport'} leg?`}
          onConfirm={() => {
            onDelete?.()
            setShowDeleteConfirm(false)
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {attachmentDetail && (
        <AttachmentDetailModal
          data={attachmentDetail}
          isEditMode={isEditMode}
          tripStartDate={tripStartDate}
          totalDays={totalDays}
          mapStyle={mapStyle}
          timeFormat={timeFormat}
          onClose={() => setAttachmentDetail(null)}
          onSave={handleAttachmentSave}
          onDelete={() => {
            if (attachmentDetail.document) {
              handleDeleteDocument(attachmentDetail.document.id)
            }
            setAttachmentDetail(null)
          }}
        />
      )}
    </>
  )
}
