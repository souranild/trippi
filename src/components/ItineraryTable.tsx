'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Place, Transport, Trip, Event, Accommodation, Document, Link as LinkType } from '@/lib/storage'
import { getDayWithDate, formatTime } from '@/lib/date-utils'
import { toggleHtmlCheckbox } from '@/lib/rich-text-utils'

interface ItineraryRow {
  id: string
  day: number
  date: string
  type: 'place' | 'transport' | 'event' | 'accommodation' | 'note' | 'document' | 'link'
  startTime: string
  endTime: string
  title: string
  location: string
  data: any // original object
  mediaCount: number
  documentCount: number
}

interface ItineraryTableProps {
  trip: Trip
  onItemClick: (type: 'place' | 'transport' | 'attachment', id: string, data?: any) => void
  isEditMode?: boolean
  onAdd?: (type: 'place' | 'transport') => void
  onUpdateTrip?: (trip: Trip) => void
  visibilitySettings?: {
    showPlaces: boolean
    showTransports: boolean
    showAccommodations: boolean
    showEvents: boolean
    showDocuments: boolean
    showLinks: boolean
    showNotes: boolean
    timeFormat?: '12h' | '24h'
    compactMode?: boolean
  }
}

export default function ItineraryTable({ 
  trip, 
  onItemClick, 
  isEditMode = false, 
  onAdd, 
  onUpdateTrip,
  visibilitySettings = {
    showPlaces: true,
    showTransports: true,
    showAccommodations: true,
    showEvents: true,
    showDocuments: true,
    showLinks: true,
    showNotes: true,
    timeFormat: '12h',
    compactMode: false
  }
}: ItineraryTableProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['place', 'transport', 'event', 'accommodation', 'note', 'document', 'link'])
  const [sortConfig, setSortConfig] = useState<{ key: keyof ItineraryRow, direction: 'asc' | 'desc' }>({ key: 'day', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    day: 100,
    time: 120,
    activity: 300,
    location: 200,
    type: 80,
    media: 70,
    docs: 70
  })

  // Resize handling
  const [resizing, setResizing] = useState<{ key: string, startX: number, startWidth: number } | null>(null)

  const handleMouseDown = (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    setResizing({
      key,
      startX: e.clientX,
      startWidth: columnWidths[key] || 100
    })
  }

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizing.startX
      setColumnWidths(prev => ({
        ...prev,
        [resizing.key]: Math.max(50, resizing.startWidth + delta)
      }))
    }

    const handleMouseUp = () => {
      setResizing(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing])

  const allRows = useMemo(() => {
    const rows: ItineraryRow[] = []

    trip.places.forEach(place => {
      // 1. Add the place itself
      if (visibilitySettings.showPlaces) {
        rows.push({
          id: place.id,
          day: place.day || 1,
          date: getDayWithDate(trip.startDate, place.day || 1),
          type: 'place',
          startTime: place.arrival || '',
          endTime: place.departure || '',
          title: place.name,
          location: place.location,
          data: place,
          mediaCount: (place.photos?.length || 0),
          documentCount: (place.documents?.length || 0) + (place.links?.length || 0)
        })
      }

      // 2. Add events
      if (place.events && visibilitySettings.showEvents) {
        place.events.forEach(event => {
          rows.push({
            id: event.id,
            day: event.day || place.day || 1,
            date: getDayWithDate(trip.startDate, event.day || place.day || 1),
            type: 'event',
            startTime: event.time || '',
            endTime: event.endTime || '',
            title: event.title,
            location: event.location || place.name,
            data: { ...event, parentPlaceId: place.id },
            mediaCount: (event.photos?.length || 0),
            documentCount: (event.documents?.length || 0)
          })
        })
      }

      // 3. Add accommodations
      if (place.accommodations && visibilitySettings.showAccommodations) {
        place.accommodations.forEach(acc => {
          rows.push({
            id: acc.id,
            day: acc.checkInDay || place.day || 1,
            date: getDayWithDate(trip.startDate, acc.checkInDay || place.day || 1),
            type: 'accommodation',
            startTime: acc.checkIn || '',
            endTime: acc.checkOut || '',
            title: `Stay at ${acc.name}`,
            location: acc.address || place.name,
            data: { ...acc, __rowType: 'accommodation', parentPlaceId: place.id },
            mediaCount: (acc.photos?.length || 0),
            documentCount: (acc.documents?.length || 0)
          })
        })
      }

      // 4. Add notes
      if (place.notes && visibilitySettings.showNotes) {
        place.notes.forEach(note => {
          rows.push({
            id: note.id || `note-${Math.random().toString(36).substr(2, 9)}`,
            day: note.day || place.day || 1,
            date: getDayWithDate(trip.startDate, note.day || place.day || 1),
            type: 'note' as any,
            startTime: '',
            endTime: '',
            title: note.text,
            location: place.name,
            data: { ...note, type: 'note', parentPlaceId: place.id },
            mediaCount: 0,
            documentCount: 0
          })
        })
      }

      // 5. Add documents
      if (place.documents && visibilitySettings.showDocuments) {
        place.documents.forEach(doc => {
          rows.push({
            id: doc.id,
            day: doc.day || place.day || 1,
            date: getDayWithDate(trip.startDate, doc.day || place.day || 1),
            type: 'document' as any,
            startTime: '',
            endTime: '',
            title: doc.name,
            location: place.name,
            data: { ...doc, type: 'document', parentPlaceId: place.id },
            mediaCount: 0,
            documentCount: 1
          })
        })
      }

      // 6. Add links
      if (place.links && visibilitySettings.showLinks) {
        place.links.forEach(link => {
          rows.push({
            id: link.id,
            day: link.day || place.day || 1,
            date: getDayWithDate(trip.startDate, link.day || place.day || 1),
            type: 'link' as any,
            startTime: '',
            endTime: '',
            title: link.title || link.url,
            location: place.name,
            data: { ...link, type: 'link', parentPlaceId: place.id },
            mediaCount: 0,
            documentCount: 1
          })
        })
      }

      // 7. Add transports (outbound connection)
      if (place.transport && visibilitySettings.showTransports) {
        place.transport.forEach(t => {
          rows.push({
            id: t.id,
            day: t.departureDay || place.day || 1,
            date: getDayWithDate(trip.startDate, t.departureDay || place.day || 1),
            type: 'transport',
            startTime: t.departure || '',
            endTime: t.arrival || '',
            title: t.title || `${t.type.toUpperCase()} to ${t.toLocation || 'next stop'}`,
            location: `${t.fromLocation || place.name} → ${t.toLocation || ''}`,
            data: { ...t, parentPlaceId: place.id },
            mediaCount: (t.photos?.length || 0),
            documentCount: (t.documents?.length || 0)
          })
        })
      }
    })

    return rows
  }, [trip.places, trip.startDate])

  const filteredRows = useMemo(() => {
    let result = allRows.filter(row => {
      const matchesSearch = row.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           row.location.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = selectedTypes.includes(row.type)
      return matchesSearch && matchesType
    })

    // Sort
    result.sort((a, b) => {
      if (sortConfig.key === 'day') {
        const diff = a.day - b.day
        if (diff !== 0) return sortConfig.direction === 'asc' ? diff : -diff
        // If same day, sort by time
        return sortConfig.direction === 'asc' 
          ? a.startTime.localeCompare(b.startTime) 
          : b.startTime.localeCompare(a.startTime)
      }
      
      const valA = String(a[sortConfig.key])
      const valB = String(b[sortConfig.key])
      return sortConfig.direction === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA)
    })

    return result
  }, [allRows, searchQuery, selectedTypes, sortConfig])

  const requestSort = (key: keyof ItineraryRow) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: keyof ItineraryRow) => {
    if (sortConfig.key !== key) return 'unfold_more'
    return sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'
  }

  const ALL_TYPES = ['place', 'transport', 'event', 'accommodation', 'note', 'document', 'link'] as const

  const getTypeIcon = (row: any) => {
    const type = typeof row === 'string' ? row : row.type
    if (row.data?.icon) return row.data.icon
    switch (type) {
      case 'place': return 'location_on'
      case 'transport': return 'flight'
      case 'event': return 'flag'
      case 'accommodation': return 'hotel'
      case 'note': return 'description'
      case 'document': return 'attachment'
      case 'link': return 'link'
      default: return 'info'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'place': return 'text-primary'
      case 'transport': return 'text-cyan-400'
      case 'event': return 'text-red-400'
      case 'accommodation': return 'text-yellow-400'
      case 'note': return 'text-emerald-400'
      case 'document': return 'text-indigo-400'
      case 'link': return 'text-orange-400'
      default: return 'text-neutral-400'
    }
  }

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.length > 1 ? prev.filter(t => t !== type) : prev // Don't allow empty
        : [...prev, type]
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-6 border-b border-white/5">
        <div className="relative w-full flex-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-lg group-focus-within:text-primary transition-colors duration-500">search</span>
          <input 
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 focus:border-primary/50 focus:bg-white/[0.07] outline-none transition-all duration-500 shadow-inner"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto self-start md:self-center">
          <div className={`transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-visible flex shrink-0 ${
            isEditMode ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0 -mr-3 pointer-events-none'
          }`}>
            <div className="relative w-max">
              <button
                onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all shadow-lg active:scale-95 ${isAddMenuOpen ? 'bg-white text-black' : 'bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20'}`}
              >
                <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isAddMenuOpen ? 'rotate-45' : ''}`}>add</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Add</span>
              </button>
              
              {isAddMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-300">
                  <button
                    onClick={() => { onAdd?.('place'); setIsAddMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-neutral-400 hover:bg-white/5 hover:text-white transition-all border-b border-white/5"
                  >
                    <span className="material-symbols-outlined text-lg text-primary">location_on</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Add Place</span>
                  </button>
                  <button
                    onClick={() => { onAdd?.('transport'); setIsAddMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-neutral-400 hover:bg-white/5 hover:text-white transition-all"
                  >
                    <span className="material-symbols-outlined text-lg text-cyan-400">flight_takeoff</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Add Travel</span>
                  </button>
                </div>
              )}
            </div>
          </div>


          <div className="h-8 w-px bg-white/10 mx-1 hidden md:block"></div>
          <div className="group/filters relative ml-auto flex items-center h-10 overflow-x-auto no-scrollbar">
            <div className="flex items-center space-x-1 sm:-space-x-3 sm:group-hover/filters:space-x-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              {ALL_TYPES.filter(type => {
                switch (type) {
                  case 'place': return visibilitySettings.showPlaces;
                  case 'transport': return visibilitySettings.showTransports;
                  case 'accommodation': return visibilitySettings.showAccommodations;
                  case 'event': return visibilitySettings.showEvents;
                  case 'document': return visibilitySettings.showDocuments;
                  case 'link': return visibilitySettings.showLinks;
                  case 'note': return visibilitySettings.showNotes;
                  default: return true;
                }
              }).map((type) => {
                const active = selectedTypes.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`relative flex items-center justify-center w-8 h-8 rounded-full border-[2px] transition-all duration-300 shrink-0 hover:z-20 hover:scale-[1.3] ${
                      active 
                        ? 'border-neutral-800 bg-neutral-900 shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-10' 
                        : 'border-neutral-900 bg-neutral-900/80 hover:bg-neutral-800 z-0'
                    }`}
                    title={`Toggle ${type}s`}
                  >
                    <span className={`material-symbols-outlined text-[14px] ${active ? getTypeColor(type) : 'text-neutral-600'}`}>
                      {getTypeIcon(type)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>


      {/* Table container with horizontal scroll */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto custom-scrollbar w-full">
          <table className="w-full text-left border-collapse table-auto lg:table-fixed min-w-[750px] lg:min-w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 select-none">
                <th className="p-4 cursor-pointer hover:bg-white/5 transition-colors relative group" style={{ width: columnWidths.day }}>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-black text-neutral-500 tracking-widest" onClick={() => requestSort('day')}>
                    Day/Date <span className="material-symbols-outlined text-sm">{getSortIcon('day')}</span>
                  </div>
                  <div onMouseDown={(e) => handleMouseDown('day', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors" />
                </th>
                <th className="p-4 cursor-pointer hover:bg-white/5 transition-colors relative group" style={{ width: columnWidths.time }}>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-black text-neutral-500 tracking-widest" onClick={() => requestSort('startTime')}>
                    Time <span className="material-symbols-outlined text-sm">{getSortIcon('startTime')}</span>
                  </div>
                  <div onMouseDown={(e) => handleMouseDown('time', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors" />
                </th>
                <th className="p-4 cursor-pointer hover:bg-white/5 transition-colors relative group" style={{ width: columnWidths.activity }}>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-black text-neutral-500 tracking-widest" onClick={() => requestSort('title')}>
                    Activity / Leg <span className="material-symbols-outlined text-sm">{getSortIcon('title')}</span>
                  </div>
                  <div onMouseDown={(e) => handleMouseDown('activity', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors" />
                </th>
                <th className="p-4 cursor-pointer hover:bg-white/5 transition-colors relative group" style={{ width: columnWidths.location }}>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-black text-neutral-500 tracking-widest" onClick={() => requestSort('location')}>
                    Location / Route <span className="material-symbols-outlined text-sm">{getSortIcon('location')}</span>
                  </div>
                  <div onMouseDown={(e) => handleMouseDown('location', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors" />
                </th>
                <th className="p-4 relative group" style={{ width: columnWidths.type }}>
                  <div className="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Type</div>
                  <div onMouseDown={(e) => handleMouseDown('type', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors" />
                </th>
                <th className="p-4 text-center relative group" style={{ width: columnWidths.media }}>
                  <div className="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Media</div>
                  <div onMouseDown={(e) => handleMouseDown('media', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors" />
                </th>
                <th className="p-4 text-center relative group" style={{ width: columnWidths.docs }}>
                  <div className="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Documents</div>
                  <div onMouseDown={(e) => handleMouseDown('docs', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => (
                  <tr 
                    key={`${row.type}-${row.id}-${idx}`}
                    onClick={() => {
                      if (row.type === 'place') onItemClick('place', row.id, row.data)
                      else if (row.type === 'transport') onItemClick('transport', row.id, row.data)
                      else onItemClick(row.type as any, row.id, row.data)
                    }}
                    className="border-b border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer group"
                  >
                    <td className={`${visibilitySettings.compactMode ? 'p-2' : 'p-4'}`}>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">Day {row.day}</span>
                        <span className="text-[10px] text-neutral-500">{row.date}</span>
                      </div>
                    </td>
                    <td className={`${visibilitySettings.compactMode ? 'p-2' : 'p-4'}`}>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-neutral-300">
                          {row.startTime ? formatTime(row.startTime, visibilitySettings.timeFormat) : '--:--'}
                          {row.endTime && ` - ${formatTime(row.endTime, visibilitySettings.timeFormat)}`}
                        </span>
                      </div>
                    </td>
                    <td className={`${visibilitySettings.compactMode ? 'p-2' : 'p-4'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 ${getTypeColor(row.type)}`}>
                          <span className="material-symbols-outlined text-lg">{getTypeIcon(row)}</span>
                        </div>
                        {row.type === 'note' ? (
                          <div 
                            className="prose-renderer text-sm text-neutral-300 w-full max-w-2xl"
                            dangerouslySetInnerHTML={{ __html: row.title }}
                            onClick={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
                                e.stopPropagation();
                                const container = e.currentTarget;
                                const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
                                const index = checkboxes.indexOf(target as HTMLInputElement);
                                
                                if (index !== -1) {
                                  const updatedText = toggleHtmlCheckbox(row.title, index);
                                  
                                  // Update trip data
                                  const updatedTrip = { ...trip };
                                  const placeIndex = updatedTrip.places.findIndex(p => p.id === row.data.parentPlaceId);
                                  if (placeIndex !== -1) {
                                    const updatedNotes = [...updatedTrip.places[placeIndex].notes || []];
                                    const noteIndex = updatedNotes.findIndex(n => n.id === row.id);
                                    if (noteIndex !== -1) {
                                      updatedNotes[noteIndex] = { ...updatedNotes[noteIndex], text: updatedText };
                                      updatedTrip.places[placeIndex] = { ...updatedTrip.places[placeIndex], notes: updatedNotes };
                                      if (onUpdateTrip) onUpdateTrip(updatedTrip);
                                    }
                                  }
                                }
                              }
                            }}
                          />
                        ) : (
                          <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{row.title}</span>
                        )}
                      </div>
                    </td>
                    <td className={`${visibilitySettings.compactMode ? 'p-2' : 'p-4'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-neutral-500">{row.data?.icon || 'location_on'}</span>
                        <span className="text-xs text-neutral-400 italic line-clamp-1">{row.location}</span>
                      </div>
                    </td>
                    <td className={`${visibilitySettings.compactMode ? 'p-2' : 'p-4'}`}>
                      <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border ${getTypeColor(row.type)} border-current/20 bg-current/5`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {row.mediaCount > 0 ? (
                        <div className="flex items-center justify-center gap-1 text-primary">
                          <span className="material-symbols-outlined text-sm">photo_library</span>
                          <span className="text-[10px] font-bold">{row.mediaCount}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-600">--</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.documentCount > 0 ? (
                        <div className="flex items-center justify-center gap-1 text-primary">
                          <span className="material-symbols-outlined text-sm">description</span>
                          <span className="text-[10px] font-bold">{row.documentCount}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-600">--</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500 italic">
                    No results found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-[0.2em]">
          Total: {filteredRows.length} Items in Itinerary
        </p>
      </div>

      {/* Floating Plus Button for Table Mode */}
      {isEditMode && (
        <div className="fixed bottom-10 right-10 z-[100] flex flex-col items-end gap-3 no-print">
          {isAddMenuOpen && (
            <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-300">
               <button
                onClick={() => { onAdd?.('place'); setIsAddMenuOpen(false); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-900 border border-white/10 text-white hover:bg-primary hover:text-black transition-all shadow-2xl group/btn"
              >
                <span className="material-symbols-outlined text-lg">location_on</span>
                <span className="text-xs font-bold uppercase tracking-widest">Add Place</span>
              </button>
              <button
                onClick={() => { onAdd?.('transport'); setIsAddMenuOpen(false); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-900 border border-white/10 text-white hover:bg-cyan-400 hover:text-black transition-all shadow-2xl group/btn"
              >
                <span className="material-symbols-outlined text-lg">flight_takeoff</span>
                <span className="text-xs font-bold uppercase tracking-widest">Add Travel</span>
              </button>
            </div>
          )}
          
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-500 active:scale-90 ${isAddMenuOpen ? 'bg-white text-black rotate-45' : 'bg-primary text-slate-950 hover:scale-110 hover:shadow-primary/30 ring-4 ring-primary/10'}`}
          >
            <span className="material-symbols-outlined text-3xl font-bold">add</span>
          </button>
        </div>
      )}
    </div>
  )
}
