'use client'

import React from 'react'
import TimePicker from '@/components/TimePicker'
import { 
  FormContainer, 
  FormContent, 
  FormSection, 
  FormLabel, 
  FormInput, 
  FormTextarea, 
  FormSelect,
  FormFooter, 
  FormGrid,
  FormListItem 
} from '@/components/FormLayout'
import { Button, ButtonGroup } from '@/components/Button'
import type { Place, Event, Document, Link as PlaceLink, Accommodation } from '@/lib/storage'

interface PlaceFormProps {
  place: Partial<Place>
  onChange: (updatedPlace: Partial<Place>) => void
  onSave: () => void
  onCancel: () => void
  saveLabel?: string
  allDaysCount: number
  disableSave?: boolean
}

export default function PlaceForm({
  place,
  onChange,
  onSave,
  onCancel,

  saveLabel = 'Save changes',
  allDaysCount,
  disableSave = false
}: PlaceFormProps) {
  const updateMetadata = (field: keyof Place, value: any) => {
    onChange({ ...place, [field]: value })
  }

  const addAccommodation = () => {
    const newAcc: Accommodation = {
      id: Date.now().toString(),
      name: 'New stay',
      type: 'hotel',
      checkIn: '',
      checkOut: '',
      documents: []
    }
    updateMetadata('accommodations', [...(place.accommodations || []), newAcc])
  }

  const removeAccommodation = (id: string) => {
    updateMetadata('accommodations', (place.accommodations || []).filter(a => a.id !== id))
  }

  const addEvent = () => {
    const newEvent: Event = {
      id: Date.now().toString(),
      title: 'New Activity',
      date: '',
      type: 'activity',
      documents: []
    }
    updateMetadata('events', [...(place.events || []), newEvent])
  }

  const removeEvent = (id: string) => {
    updateMetadata('events', (place.events || []).filter(e => e.id !== id))
  }

  const addLink = () => {
    const newLink: PlaceLink = {
      id: Date.now().toString(),
      title: 'New Link',
      url: ''
    }
    updateMetadata('links', [...(place.links || []), newLink])
  }

  const removeLink = (id: string) => {
    updateMetadata('links', (place.links || []).filter(l => l.id !== id))
  }

  const addDocument = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
      name: 'New Document',
      type: 'other'
    }
    updateMetadata('documents', [...(place.documents || []), newDoc])
  }

  const removeDocument = (id: string) => {
    updateMetadata('documents', (place.documents || []).filter(d => d.id !== id))
  }

  return (
    <FormContainer>
      <FormContent>
        {/* Basic Info */}
        <FormSection>
          <FormGrid columns={2}>
            <FormSelect
              label="Start Day"
              labelVariant="primary"
              value={place.day || 1}
              onChange={(e) => {
                const newDay = parseInt(e.target.value);
                const updates: Partial<Place> = { day: newDay };
                if (place.endDay && place.endDay < newDay) {
                  updates.endDay = newDay;
                }
                onChange({ ...place, ...updates });
              }}
              options={Array.from({ length: allDaysCount }).map((_, i) => ({
                value: i + 1,
                label: `Day ${i + 1}`
              }))}
            />
            <FormSelect
              label="End Day"
              labelVariant="primary"
              value={place.endDay || place.day || 1}
              onChange={(e) => updateMetadata('endDay', parseInt(e.target.value))}
              options={Array.from({ length: allDaysCount }).map((_, i) => ({
                value: i + 1,
                label: `Day ${i + 1}`,
                disabled: (i + 1) < (place.day || 1)
              }))}
            />
            <div className="space-y-2">
              <FormLabel variant="primary">Location</FormLabel>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white truncate">
                {place.name}
              </div>
            </div>
          </FormGrid>

          <FormGrid columns={2}>
            <div className="space-y-2">
              <FormLabel variant="secondary">Arrival</FormLabel>
              <TimePicker
                value={place.arrival || ''}
                onChange={(val) => updateMetadata('arrival', val)}
                placeholder="--:--"
              />
            </div>
            <div className="space-y-2">
              <FormLabel variant="secondary">Departure</FormLabel>
              <TimePicker
                value={place.departure || ''}
                onChange={(val) => updateMetadata('departure', val)}
                placeholder="--:--"
              />
            </div>
          </FormGrid>
        </FormSection>

        {/* Notes */}
        <FormTextarea
          label={`Notes for Day ${place.day || 1}`}
          labelVariant="tertiary"
          value={place.notes?.find(n => n.day === (place.day || 1))?.text || ''}
          onChange={(e) => {
            const day = place.day || 1
            const text = e.target.value
            const newNotes = [...(place.notes || [])]
            const index = newNotes.findIndex(n => n.day === day)
            if (index >= 0) {
              newNotes[index] = { day, text }
            } else {
              newNotes.push({ day, text })
            }
            updateMetadata('notes', newNotes)
          }}
          placeholder="Add some notes about this place..."
        />

        {/* Dynamic Lists */}
        <div className="space-y-6">
          {/* Accommodations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel variant="default">Accommodations</FormLabel>
              <button 
                onClick={addAccommodation} 
                className="text-xs font-bold text-yellow-400 hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">add</span> Add
              </button>
            </div>
            <div className="space-y-2">
              {(place.accommodations || []).map((acc, idx) => (
                <FormListItem
                  key={acc.id}
                  onDelete={() => removeAccommodation(acc.id)}
                >
                  <input
                    value={acc.name}
                    placeholder="Accommodation Name"
                    onChange={(e) => {
                      const newAccs = [...(place.accommodations || [])]
                      newAccs[idx] = { ...acc, name: e.target.value }
                      updateMetadata('accommodations', newAccs)
                    }}
                    className="flex-1 bg-transparent border-none text-[10px] text-white focus:outline-none w-full"
                  />
                </FormListItem>
              ))}
            </div>
          </div>

          {/* Events */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel variant="default">Activities & Events</FormLabel>
              <button 
                onClick={addEvent} 
                className="text-xs font-bold text-red-400 hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">add</span> Add
              </button>
            </div>
            <div className="space-y-2">
              {(place.events || []).map((event, idx) => (
                <FormListItem
                  key={event.id}
                  onDelete={() => removeEvent(event.id)}
                >
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      value={event.title}
                      placeholder="Activity Title"
                      onChange={(e) => {
                        const newEvents = [...(place.events || [])]
                        newEvents[idx] = { ...event, title: e.target.value }
                        updateMetadata('events', newEvents)
                      }}
                      className="w-full bg-transparent border-none text-sm font-bold text-white focus:outline-none"
                    />
                  </div>
                </FormListItem>
              ))}
            </div>
          </div>

          {/* Documents and Links */}
          <FormGrid columns={2}>
            {/* Documents */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel variant="default">Documents</FormLabel>
                <button 
                  onClick={addDocument} 
                  className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">attach_file</span> Add
                </button>
              </div>
              <div className="space-y-2">
                {(place.documents || []).map((doc, idx) => (
                  <FormListItem
                    key={doc.id}
                    onDelete={() => removeDocument(doc.id)}
                  >
                    <input
                      value={doc.name}
                      onChange={(e) => {
                        const newDocs = [...(place.documents || [])]
                        newDocs[idx] = { ...doc, name: e.target.value }
                        updateMetadata('documents', newDocs)
                      }}
                      className="flex-1 bg-transparent border-none text-[10px] text-white focus:outline-none w-full"
                    />
                  </FormListItem>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel variant="default">Links</FormLabel>
                <button 
                  onClick={addLink} 
                  className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">link</span> Add
                </button>
              </div>
              <div className="space-y-2">
                {(place.links || []).map((link, idx) => {
                  const domain = link.url && link.url.match(/^https?:\/\//) ? link.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : ''
                  const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : ''

                  return (
                    <FormListItem
                      key={link.id}
                      onDelete={() => removeLink(link.id)}
                    >
                      <div className="flex gap-2.5 w-full items-start">
                        <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center overflow-hidden shrink-0 p-1.5 mt-0.5">
                          {favicon ? (
                            <img 
                              src={favicon} 
                              className="w-full h-full object-contain" 
                              alt="" 
                              onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2322d3ee" stroke-width="2" opacity="0.4"><circle cx="12" cy="12" r="10"/></svg>' }} 
                            />
                          ) : (
                            <span className="material-symbols-outlined text-cyan-400/40 text-sm">link</span>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5 w-full min-w-0">
                          <input
                            value={link.url}
                            placeholder="URL (https://...)"
                            onChange={(e) => {
                              const newLinks = [...(place.links || [])]
                              newLinks[idx] = { ...link, url: e.target.value }
                              updateMetadata('links', newLinks)
                            }}
                            className="w-full bg-transparent border-none text-[10px] text-cyan-400/80 focus:outline-none placeholder:text-cyan-400/30"
                          />
                          <input
                            value={link.title}
                            placeholder="Label (Optional)"
                            onChange={(e) => {
                              const newLinks = [...(place.links || [])]
                              newLinks[idx] = { ...link, title: e.target.value }
                              updateMetadata('links', newLinks)
                            }}
                            className="w-full bg-transparent border-none text-[10px] text-white focus:outline-none font-bold placeholder:font-normal placeholder:text-white/30"
                          />
                        </div>
                      </div>
                    </FormListItem>
                  )
                })}
              </div>
            </div>
          </FormGrid>
        </div>
      </FormContent>

      <FormFooter>
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={onSave}
          disabled={disableSave || !place || !place.name}
          className="text-caption py-3.5 shadow-primary/10"
        >
          {saveLabel}
        </Button>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={onCancel}
          className="text-caption py-3"
        >
          Cancel
        </Button>
      </FormFooter>
    </FormContainer>
  )
}
