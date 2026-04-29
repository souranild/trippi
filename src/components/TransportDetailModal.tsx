'use client'

import React, { useState, useMemo } from 'react'
import { Transport, TransportMode } from '@/lib/storage'
import { DateTimeSelector } from '@/components/DateTimeSelector'
import { getDayWithDate } from '@/lib/date-utils'
import {
  BaseDetailModal
} from '@/components/ModalLayout'
import { Button } from '@/components/Button'
import { FormInput, FormLabel, FormListItem } from '@/components/FormLayout'
import { ConfirmationModal } from './ConfirmationModal'
import { TRANSPORT_MODES, normalizeTransportMode } from '@/lib/transport-options'
import LocationPickerModal from './LocationPickerModal'
import Map from '@/components/Map'

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
  mapStyle?: string
  onSave: (leg: Transport) => void
  onDelete?: () => void
  onClose: () => void
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
  mapStyle,
  onSave,
  onDelete,
  onClose,
}: TransportDetailModalProps) {
  // --- 1. State ---
  const [isEditMode, setIsEditMode] = useState(initialEditMode)
  const [mode, setMode] = useState<TransportMode | null>(
    leg ? normalizeTransportMode(leg.type) : (TRANSPORT_MODES[0].type as TransportMode)
  )
  const [title, setTitle] = useState(leg?.title || '')
  const [departure, setDeparture] = useState(leg?.departure || '')
  const [departureDay, setDepartureDay] = useState<number>(leg?.departureDay ?? defaultDay ?? 1)
  const [arrival, setArrival] = useState(leg?.arrival || '')
  const [arrivalDay, setArrivalDay] = useState<number>(leg?.arrivalDay ?? defaultDay ?? 1)
  const [ticketNumber, setTicketNumber] = useState(leg?.ticketNumber || '')
  const [fromLocation, setFromLocation] = useState(leg?.fromLocation || '')
  const [toLocation, setToLocation] = useState(leg?.toLocation || '')
  
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [pickingFor, setPickingFor] = useState<'from' | 'to' | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // --- 2. Derived State ---
  const dayOptions = useMemo(() => Array.from({ length: totalDays }, (_, i) => ({
    value: i + 1,
    label: getDayWithDate(tripStartDate, i + 1)
  })), [totalDays, tripStartDate])

  const currentMode = TRANSPORT_MODES.find(m => m.type === mode) || TRANSPORT_MODES[0]

  // --- 3. Handlers ---
  const handleSave = () => {
    if (!mode) return
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

      {/* Departure Section */}
      <div className="space-y-3 pb-4 border-b border-white/10">
        <FormLabel variant="primary" className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">login</span> Departure
        </FormLabel>

        {/* Location first */}
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

        <DateTimeSelector
          label="Departure"
          icon="schedule"
          dayValue={departureDay}
          timeValue={departure}
          dayOptions={dayOptions}
          onDayChange={d => {
            setDepartureDay(d)
            if (arrivalDay < d) setArrivalDay(d)
          }}
          onTimeChange={setDeparture}
          disabled={!isEditMode}
        />
      </div>

      {/* Arrival Section */}
      <div className="space-y-3 pb-4 border-b border-white/10">
        <FormLabel variant="primary" className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">logout</span> Arrival
        </FormLabel>

        {/* Location first */}
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
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary/20 text-primary rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <span className="material-symbols-outlined text-sm">edit_location</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DateTimeSelector
          label="Arrival"
          icon="schedule"
          dayValue={arrivalDay}
          timeValue={arrival}
          dayOptions={dayOptions}
          onDayChange={setArrivalDay}
          onTimeChange={setArrival}
          disabled={!isEditMode}
        />
      </div>

      <FormInput
        label="Ticket / Confirmation #"
        labelVariant="primary"
        disabled={!isEditMode}
        value={ticketNumber}
        onChange={e => setTicketNumber(e.target.value)}
        placeholder="Booking reference..."
      />

      {/* Documents Section */}
      <div className="space-y-4 pt-2">
        <FormLabel variant="primary" className="mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">folder_open</span> Documents
        </FormLabel>
        <div className="space-y-2">
          {(leg?.documents || []).map((doc, idx) => (
            <FormListItem key={doc.id || `doc-${idx}`} className="border-white/10" onDelete={isEditMode ? () => {} : undefined}>
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="material-symbols-outlined text-blue-400">description</span>
                <div className="min-w-0">
                  <p className="text-xs text-white font-bold truncate">{doc.name}</p>
                  <p className="text-white/40 text-[10px]">{doc.type}</p>
                </div>
              </div>
            </FormListItem>
          ))}
          {(!leg?.documents || leg.documents.length === 0) && (
            <p className="text-neutral-500 text-[10px] font-bold text-center py-2 opacity-40">No documents attached</p>
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
        focusedPlaceId="from"
        showDayNumbers={false}
        showControls={true}
        mapStyle={mapStyle}
      />
    </div>
  )

  // --- 5. Main Render ---
  return (
    <>
      <BaseDetailModal
        isOpen={true}
        onClose={onClose}
        title={isEditMode ? 'Edit Transport' : (title || currentMode.label)}
        subtitle={`${fromName} → ${toName}`}
        icon={currentMode.icon}
        iconColor={currentMode.color}
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
                  <Button variant="modal-primary" icon="save" onClick={handleSave}>Save Route</Button>
                </React.Fragment>
              ) : (
                <React.Fragment key="view-mode-actions">
                  <Button variant="modal-secondary" icon="edit" onClick={() => setIsEditMode(true)}>Edit Route</Button>
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

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Transport?"
        message={`Are you sure you want to delete this ${mode || 'transport'} leg?`}
        onConfirm={() => {
          onDelete?.()
          setShowDeleteConfirm(false)
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
