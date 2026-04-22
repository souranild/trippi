'use client'

import React from 'react'
import TimePicker from '@/components/TimePicker'
import type { Place, Event, Document, Link as PlaceLink } from '@/lib/storage'

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
  const updateMetadata = (field: keyof Place, value: string | number | boolean) => {
    onChange({ ...place, [field]: value })
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
    <div className="flex flex-col h-full max-h-[85vh]">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-hide">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Day</label>
              <select
                value={place.day || 1}
                onChange={(e) => updateMetadata('day', parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                {Array.from({ length: Math.max(place.day || 1, allDaysCount + 1) }).map((_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-neutral-900 leading-normal">Day {i + 1}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Location</label>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white truncate">
                {place.name}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em]">Arrival</label>
              <TimePicker
                value={place.arrival || ''}
                onChange={(val) => updateMetadata('arrival', val)}
                placeholder="--:--"
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em]">Departure</label>
              <TimePicker
                value={place.departure || ''}
                onChange={(val) => updateMetadata('departure', val)}
                placeholder="--:--"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-tertiary uppercase tracking-[0.2em]">Notes</label>
          <textarea
            value={place.notes || ''}
            onChange={(e) => updateMetadata('notes', e.target.value)}
            placeholder="Add some notes about this place..."
            className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-tertiary transition-colors resize-none text-sm"
          />
        </div>

        {/* Documents and Links */}
        <div className="grid grid-cols-2 gap-4">
          {/* Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Documents</label>
              <button onClick={addDocument} className="text-[10px] font-bold text-secondary uppercase tracking-tighter hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">attach_file</span> Add
              </button>
            </div>
            <div className="space-y-2">
              {(place.documents || []).map((doc, idx) => (
                <div key={doc.id} className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-2 group">
                  <input
                    value={doc.name}
                    onChange={(e) => {
                      const newDocs = [...(place.documents || [])]
                      newDocs[idx] = { ...doc, name: e.target.value }
                      updateMetadata('documents', newDocs)
                    }}
                    className="flex-1 bg-transparent border-none text-[10px] text-white focus:outline-none"
                  />
                  <button onClick={() => removeDocument(doc.id)} className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Links</label>
              <button onClick={addLink} className="text-[10px] font-bold text-tertiary uppercase tracking-tighter hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">link</span> Add
              </button>
            </div>
            <div className="space-y-2">
              {(place.links || []).map((link, idx) => (
                <div key={link.id} className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-2 group">
                  <input
                    value={link.title}
                    placeholder="Title"
                    onChange={(e) => {
                      const newLinks = [...(place.links || [])]
                      newLinks[idx] = { ...link, title: e.target.value }
                      updateMetadata('links', newLinks)
                    }}
                    className="flex-1 bg-transparent border-none text-[10px] text-white focus:outline-none"
                  />
                  <button onClick={() => removeLink(link.id)} className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Lists */}
        <div className="space-y-4">
          {/* Events */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Activities & Events</label>
              <button onClick={addEvent} className="text-[10px] font-bold text-primary uppercase tracking-tighter hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">add</span> Add
              </button>
            </div>
            <div className="space-y-2">
              {(place.events || []).map((event, idx) => (
                <div key={event.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 group">
                  <div className="flex-1 space-y-2">
                    <input
                      value={event.title}
                      onChange={(e) => {
                        const newEvents = [...(place.events || [])]
                        newEvents[idx] = { ...event, title: e.target.value }
                        updateMetadata('events', newEvents)
                      }}
                      className="w-full bg-transparent border-none text-sm font-bold text-white focus:outline-none"
                    />
                    <div className="flex items-center gap-4">
                      <input
                        type="time"
                        value={event.time || ''}
                        onChange={(e) => {
                          const newEvents = [...(place.events || [])]
                          newEvents[idx] = { ...event, time: e.target.value }
                          updateMetadata('events', newEvents)
                        }}
                        className="bg-transparent border-none text-[10px] text-neutral-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button onClick={() => removeEvent(event.id)} className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-3 bg-white/5 backdrop-blur-xl shrink-0 border-t border-white/5">
        <button
          onClick={onSave}
          disabled={disableSave || !place || !place.name}
          className="btn-primary btn-md w-full text-caption py-3.5 shadow-primary/10"
        >
          {saveLabel}
        </button>
        <button
          onClick={onCancel}
          className="btn-secondary btn-md w-full text-caption py-3"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
