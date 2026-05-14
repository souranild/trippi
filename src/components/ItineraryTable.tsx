'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Trip } from '@/lib/storage'
import { getDayWithDate, formatTime, calculateTimeDuration } from '@/lib/date-utils'
import { toggleHtmlCheckbox } from '@/lib/rich-text-utils'
import { isSameDay, addDays } from 'date-fns'
import { transportModeLabel } from '@/lib/transport-options'

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
  ticketNumber?: string
  duration?: string
  isLive?: boolean
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
  const places = trip.places || []
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['place', 'transport', 'event', 'accommodation', 'note', 'document', 'link'])
  const [sortConfig, setSortConfig] = useState<{ key: keyof ItineraryRow, direction: 'asc' | 'desc' }>({ key: 'day', direction: 'asc' })

  // Live time for ongoing indicator
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])
  
  const getTransportLiveStatus = (leg: any, currentDayNum: number) => {
    if (!trip || !trip.startDate) return false;
    const now = new Date();
    const nowTimeMins = now.getHours() * 60 + now.getMinutes();
    const startParts = trip.startDate.split('-').map(Number);
    const startObj = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const rowDayObj = addDays(startObj, currentDayNum - 1);
    const isToday = isSameDay(rowDayObj, now);
    if (!isToday) return false;

    if (!leg.departure || !leg.arrival) return false;
    
    const depDay = leg.departureDay ?? currentDayNum;
    const arrDay = leg.arrivalDay ?? depDay;
    
    if (currentDayNum < depDay || currentDayNum > arrDay) return false;
    
    const [dh, dm] = leg.departure.split(':').map(Number);
    const [ah, am] = leg.arrival.split(':').map(Number);
    const depMins = dh * 60 + dm;
    const arrMins = ah * 60 + am;
    
    if (currentDayNum === depDay && currentDayNum === arrDay) {
      return nowTimeMins >= depMins && nowTimeMins <= arrMins;
    } else if (currentDayNum === depDay) {
      return nowTimeMins >= depMins;
    } else if (currentDayNum === arrDay) {
      return nowTimeMins <= arrMins;
    }
    return true; // Middle day of multi-day transport
  }

  const allRows = useMemo(() => {
    const rows: ItineraryRow[] = []

    trip.places.forEach(place => {
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

      if (place.transport && visibilitySettings.showTransports) {
        place.transport.forEach(t => {
          rows.push({
            id: t.id,
            day: t.departureDay || place.day || 1,
            date: getDayWithDate(trip.startDate, t.departureDay || place.day || 1),
            type: 'transport',
            startTime: t.departure || '',
            endTime: t.arrival || '',
            title: t.title || transportModeLabel(t.type),
            location: `${t.fromLocation || place.name} → ${t.toLocation || ''}`,
            data: { ...t, parentPlaceId: place.id },
            mediaCount: (t.photos?.length || 0),
            documentCount: (t.documents?.length || 0),
            ticketNumber: t.ticketNumber,
            duration: calculateTimeDuration(t.departure || '', t.departureDay || place.day || 1, t.arrival || '', t.arrivalDay || t.departureDay || place.day || 1) || undefined
          })
        })
      }
    })

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    return rows.map(row => {
      let isLive = false;
      if (trip.startDate) {
        const rowDay = row.day || 1;
        const startParts = trip.startDate.split('-').map(Number);
        const startObj = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const rowDayObj = addDays(startObj, rowDay - 1);
        const isToday = isSameDay(rowDayObj, now);
        
        if (isToday) {
          if (row.type === 'transport') {
            isLive = getTransportLiveStatus(row.data, rowDay);
          } else if (row.startTime && row.endTime) {
            const [sh, sm] = row.startTime.split(':').map(Number);
            const [eh, em] = row.endTime.split(':').map(Number);
            const startMins = sh * 60 + sm;
            const endMins = eh * 60 + em;
            isLive = nowMins >= startMins && nowMins <= endMins;
          }
        }
      }
      return { ...row, isLive };
    });
  }, [trip.places, trip.startDate, visibilitySettings])

  const filteredRows = useMemo(() => {
    let result = allRows.filter(row => {
      const matchesSearch = row.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           row.location.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = selectedTypes.includes(row.type)
      return matchesSearch && matchesType
    })

    result.sort((a, b) => {
      if (sortConfig.key === 'day') {
        const diff = a.day - b.day
        if (diff !== 0) return sortConfig.direction === 'asc' ? diff : -diff
        return sortConfig.direction === 'asc' 
          ? a.startTime.localeCompare(b.startTime) 
          : b.startTime.localeCompare(a.startTime)
      }
      const valA = String(a[sortConfig.key])
      const valB = String(b[sortConfig.key])
      return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })

    return result
  }, [allRows, searchQuery, selectedTypes, sortConfig])

  const ALL_TYPES = ['place', 'transport', 'event', 'accommodation', 'note', 'document', 'link'] as const

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'place': return 'location_on'
      case 'transport': return 'commute'
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
      case 'transport': return 'text-primary'
      case 'activity': return 'text-rose-400'
      case 'event': return 'text-rose-400'
      case 'accommodation': return 'text-yellow-400'
      case 'note': return 'text-indigo-400'
      case 'document': return 'text-blue-400'
      case 'link': return 'text-cyan-400'
      default: return 'text-neutral-400'
    }
  }

  const getTypeBg = (type: string) => {
    switch (type) {
      case 'place': return 'bg-primary/20 border-primary/50 text-primary'
      case 'transport': return 'bg-primary/20 border-primary/50 text-primary'
      case 'activity': return 'bg-rose-500/20 border-rose-500/50 text-rose-400'
      case 'event': return 'bg-rose-500/20 border-rose-500/50 text-rose-400'
      case 'accommodation': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
      case 'note': return 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
      case 'document': return 'bg-blue-500/20 border-blue-500/50 text-blue-400'
      case 'link': return 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
      default: return 'bg-white/5 border-white/10 text-neutral-500'
    }
  }


  const isOngoing = (row: ItineraryRow) => {
    if (!row.startTime || !row.endTime) return false
    const rowDate = new Date(trip.startDate)
    rowDate.setDate(rowDate.getDate() + (row.day - 1))
    
    const nowTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
    const todayStr = now.toISOString().split('T')[0]
    const rowDateStr = rowDate.toISOString().split('T')[0]
    
    if (todayStr !== rowDateStr) return false
    return nowTimeStr >= row.startTime && nowTimeStr <= row.endTime
  }

  const handleSort = (key: keyof ItineraryRow) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const sortIcon = (key: keyof ItineraryRow) => {
    if (sortConfig.key !== key) return <span className="material-symbols-outlined text-[10px] opacity-30">unfold_more</span>
    return <span className="material-symbols-outlined text-[10px] text-primary">{sortConfig.direction === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-6 border-b border-white/5">
        <div className="relative w-full flex-1 md:min-w-[300px] lg:min-w-[400px] group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-lg group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text"
            placeholder="Search itinerary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 focus:border-primary/50 focus:bg-white/[0.07] outline-none transition-all shadow-inner"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 min-w-0">
          {['place', 'transport', 'activity', 'event', 'accommodation', 'note', 'document', 'link'].map(type => {
            const active = selectedTypes.includes(type === 'activity' ? 'activity' : type) || (type === 'activity' && selectedTypes.includes('event'))
            return (
              <button
                key={type}
                onClick={() => {
                  const t = type === 'activity' ? 'activity' : type
                  setSelectedTypes(prev => prev.includes(t) ? prev.filter(item => item !== t) : [...prev, t])
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all shrink-0 ${active ? getTypeBg(type) : 'bg-white/5 border-white/10 text-neutral-500 hover:bg-white/10'}`}
              >
                <span className="material-symbols-outlined text-[16px]">{getTypeIcon(type === 'activity' ? 'event' : type)}</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{type}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table View */}
      <div className="w-full overflow-x-auto rounded-[1.25rem] border border-white/10 bg-white/[0.02]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-black/40">
              <th onClick={() => handleSort('day')} className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 cursor-pointer hover:text-white transition-colors whitespace-nowrap">
                <div className="flex items-center gap-1">Day {sortIcon('day')}</div>
              </th>
              <th onClick={() => handleSort('type')} className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 cursor-pointer hover:text-white transition-colors whitespace-nowrap">
                <div className="flex items-center gap-1">Type {sortIcon('type')}</div>
              </th>
              <th onClick={() => handleSort('title')} className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Activity {sortIcon('title')}</div>
              </th>
              <th onClick={() => handleSort('location')} className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Location {sortIcon('location')}</div>
              </th>
              <th onClick={() => handleSort('startTime')} className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 cursor-pointer hover:text-white transition-colors whitespace-nowrap">
                <div className="flex items-center gap-1">Time {sortIcon('startTime')}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, idx) => {
                const active = false;
                return (
                  <tr 
                key={`${row.type}-${row.id}-${idx}`}
                id={`${row.type}-${row.id}`}
                onClick={() => onItemClick(row.type === 'transport' ? 'transport' : row.type === 'place' ? 'place' : 'attachment', row.id, row.data)}
                className={`group border-b border-white/5 transition-all duration-300 cursor-pointer ${
                  active ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-white/[0.04]'
                }`}
              >
                {/* Day */}
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {row.isLive && (
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(195,244,0,0.8)]" />
                    )}
                    <span className={`text-sm font-black ${active ? 'text-primary' : 'text-neutral-400'}`}>Day {row.day}</span>
                  </div>
                </td>

                {/* Type */}
                <td className="p-4">
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${active ? 'bg-primary text-black' : 'bg-white/5 ' + getTypeColor(row.type)}`}>
                    <span className="material-symbols-outlined text-[18px]">{getTypeIcon(row.type)}</span>
                  </div>
                </td>

                {/* Activity / Title */}
                <td className="p-4">
                  {row.type === 'note' ? (
                    <div 
                      className="prose-renderer text-neutral-300 text-xs line-clamp-2 max-w-sm"
                      dangerouslySetInnerHTML={{ __html: row.title }}
                    />
                  ) : (
                    <div>
                      <h3 className={`font-bold text-sm ${row.isLive ? 'text-white' : 'text-neutral-200 group-hover:text-primary transition-colors'}`}>
                        {row.title}
                      </h3>
                      {row.ticketNumber && (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 bg-white/5 rounded border border-white/10 text-[9px] text-neutral-400">
                          <span className="material-symbols-outlined text-[10px] text-primary">confirmation_number</span>
                          <span>{row.ticketNumber}</span>
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {/* Location */}
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[12px] text-neutral-600">location_on</span>
                    <p className="text-xs text-neutral-400 truncate max-w-[200px]">{row.location || '-'}</p>
                  </div>
                </td>

                {/* Time & Details */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-neutral-300 whitespace-nowrap">
                        {row.startTime ? formatTime(row.startTime, visibilitySettings.timeFormat) : '--:--'}
                      </span>
                      {row.endTime && row.startTime !== row.endTime && (
                        <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                          to {formatTime(row.endTime, visibilitySettings.timeFormat)}
                        </span>
                      )}
                    </div>
                    {row.duration && (
                      <span className="px-1.5 py-0.5 bg-primary/10 rounded border border-primary/20 text-[9px] text-primary font-bold whitespace-nowrap">
                        {row.duration}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            )
              })
            ) : (
              <tr>
                <td colSpan={5}>
                  <div className="py-20 text-center space-y-4 text-neutral-500">
                    <span className="material-symbols-outlined text-4xl opacity-50">filter_list_off</span>
                    <p className="text-sm italic">No matches found for your current filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Plus Button for Edit Mode */}
      {isEditMode && (
        <div className="fixed bottom-10 right-10 z-[100] flex flex-col items-end gap-3 no-print">
          {isAddMenuOpen && (
            <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-5 duration-300">
              <button
                onClick={() => { onAdd?.('place'); setIsAddMenuOpen(false); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-900 border border-white/10 text-white hover:bg-primary hover:text-black transition-all shadow-2xl"
              >
                <span className="material-symbols-outlined text-lg text-primary group-hover:text-black">location_on</span>
                <span className="text-xs font-black uppercase tracking-widest">Add Place</span>
              </button>
              <button
                onClick={() => { onAdd?.('transport'); setIsAddMenuOpen(false); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-900 border border-white/10 text-white hover:bg-cyan-400 hover:text-black transition-all shadow-2xl"
              >
                <span className="material-symbols-outlined text-lg text-cyan-400 group-hover:text-black">commute</span>
                <span className="text-xs font-black uppercase tracking-widest">Add Travel</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-90 ${isAddMenuOpen ? 'bg-white text-black rotate-45' : 'bg-primary text-slate-950 hover:scale-110 ring-4 ring-primary/10'}`}
          >
            <span className="material-symbols-outlined text-3xl font-bold">add</span>
          </button>
        </div>
      )}
    </div>
  )
}
