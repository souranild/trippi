'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, eachMonthOfInterval, startOfYear, endOfYear, addYears } from 'date-fns'
import { formatTime } from '@/lib/date-utils'

interface CalendarViewProps {
  trip: any
  places: any[]
  onPlaceClick: (place: any) => void
  onAddPlace: (day: number) => void
  timeFormat?: '12h' | '24h'
}

type ViewType = 'day' | '3day' | 'week' | 'month' | 'year'

const getTypeStyles = (type: string, isLive?: boolean) => {
  const baseClasses = 'border transition-all cursor-pointer shadow-sm hover:brightness-110 active:scale-[0.98]'
  if (isLive) {
    return `${baseClasses} bg-primary border-primary text-black shadow-[0_0_20px_rgba(195,244,0,0.4)] z-20`
  }
  switch (type) {
    case 'place': return `${baseClasses} bg-primary/20 border-primary/40 text-primary font-bold`
    case 'transport': return `${baseClasses} bg-primary/20 border-primary/40 text-primary`
    case 'activity': return `${baseClasses} bg-rose-500/20 border-rose-500/40 text-rose-300`
    case 'event': return `${baseClasses} bg-rose-500/20 border-rose-500/40 text-rose-300`
    case 'accommodation': return `${baseClasses} bg-yellow-500/20 border-yellow-500/40 text-yellow-300`
    default: return `${baseClasses} bg-neutral-800 border-white/10 text-white`
  }
}

// Helper to calculate event positions for overlapping events
const getEventPositions = (events: any[]) => {
  if (!events.length) return []

  // 1. Sort by start time, then duration
  const sorted = [...events].sort((a, b) => {
    const aTime = a.startTime || '00:00'
    const bTime = b.startTime || '00:00'
    if (aTime !== bTime) return aTime.localeCompare(bTime)
    return (b.endTime || '23:59').localeCompare(a.endTime || '23:59')
  })

  const columns: any[][] = []
  const results: any[] = []

  sorted.forEach(event => {
    let placed = false
    const start = event.startTime || '00:00'
    
    for (let i = 0; i < columns.length; i++) {
      const lastInCol = columns[i][columns[i].length - 1]
      if ((lastInCol.endTime || '23:59') <= start) {
        columns[i].push(event)
        event.colIndex = i
        placed = true
        break
      }
    }

    if (!placed) {
      columns.push([event])
      event.colIndex = columns.length - 1
    }
  })

  // Group overlapping events to calculate totalCols
  sorted.forEach(event => {
    let group = sorted.filter(e => 
      (e.startTime < event.endTime && e.endTime > event.startTime)
    )
    
    // Find the max colIndex in this overlapping group
    let maxCol = 0
    group.forEach(e => {
      if (e.colIndex > maxCol) maxCol = e.colIndex
    })
    
    // For GCal style, totalCols should be at least maxCol + 1
    // But to be simple, we'll use columns.length if they overlap
    event.totalCols = columns.length
    results.push(event)
  })

  return results
}

export default function CalendarView({ trip, places, onPlaceClick, onAddPlace, timeFormat = '12h' }: CalendarViewProps) {
  const tripStartDate = useMemo(() => new Date(trip?.startDate || new Date()), [trip?.startDate])
  
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date()
    const start = new Date(trip?.startDate || today)
    const end = new Date(trip?.endDate || today)
    if (today >= start && today <= end) return today
    return start
  })

  const [view, setView] = useState<ViewType>('week')

  const getDayNumber = (date: Date) => {
    const d1 = new Date(tripStartDate)
    d1.setHours(0,0,0,0)
    const d2 = new Date(date)
    d2.setHours(0,0,0,0)
    const diffTime = d2.getTime() - d1.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const totalDays = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return 1
    const start = new Date(trip.startDate)
    const end = new Date(trip.endDate)
    const diffTime = end.getTime() - start.getTime()
    return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1)
  }, [trip?.startDate, trip?.endDate])

  const jumpToDay = (dayNum: number) => {
    const targetDate = addDays(tripStartDate, dayNum - 1)
    setCurrentDate(targetDate)
  }

  const navigate = (direction: 'prev' | 'next') => {
    const amount = direction === 'next' ? 1 : -1
    switch (view) {
      case 'day': setCurrentDate(addDays(currentDate, amount)); break
      case '3day': setCurrentDate(addDays(currentDate, amount * 3)); break
      case 'week': setCurrentDate(addDays(currentDate, amount * 7)); break
      case 'month': setCurrentDate(addMonths(currentDate, amount)); break
      case 'year': setCurrentDate(addYears(currentDate, amount)); break
    }
  }

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const nowTop = useMemo(() => {
    return (now.getHours() * 48) + (now.getMinutes() / 60 * 48)
  }, [now])

  const allItems = useMemo(() => {
    const items: any[] = []
    
    places.forEach(place => {
      // 1. Places
      items.push({
        id: place.id,
        type: 'place',
        name: place.name,
        emoji: place.emoji || '📍',
        day: place.day || 1,
        endDay: place.endDay || place.day || 1,
        startTime: place.arrival || '00:00',
        endTime: place.departure || '23:59',
        allDay: false, // In Pic 1, Places are in the grid
        data: place
      })

      // 2. Transport
      if (place.transport) {
        place.transport.forEach((t: any) => {
          items.push({
            id: t.id,
            type: 'transport',
            name: t.title || 'Travel',
            emoji: 'commute',
            day: t.departureDay || place.day || 1,
            endDay: t.arrivalDay || t.departureDay || place.day || 1,
            startTime: t.departure || '00:00',
            endTime: t.arrival || '23:59',
            allDay: false,
            data: { ...t, parentPlaceId: place.id }
          })
        })
      }

      // 3. Events / Activities
      if (place.events) {
        place.events.forEach((e: any) => {
          items.push({
            id: e.id,
            type: 'activity',
            name: e.title,
            emoji: 'flag',
            day: e.day || place.day || 1,
            endDay: e.endDay || e.day || place.day || 1,
            startTime: e.time || '00:00',
            endTime: e.endTime || '23:59',
            allDay: false,
            data: { ...e, parentPlaceId: place.id }
          })
        })
      }

      // 4. Accommodations
      if (place.accommodations) {
        place.accommodations.forEach((acc: any) => {
          items.push({
            id: acc.id,
            type: 'accommodation',
            name: acc.name,
            emoji: 'hotel',
            day: acc.checkInDay || place.day || 1,
            endDay: acc.checkOutDay || place.endDay || place.day || 1,
            startTime: acc.checkIn || '00:00',
            endTime: acc.checkOut || '23:59',
            allDay: true, // Multi-day bars
            data: { ...acc, parentPlaceId: place.id }
          })
        })
      }
    })

    const nowTimeMins = now.getHours() * 60 + now.getMinutes()
    return items.map(item => {
      let isLive = false
      if (trip.startDate) {
        const itemDay = item.day || 1
        const itemEndDay = item.endDay || itemDay
        const tripStart = new Date(trip.startDate)
        const itemDate = addDays(tripStart, itemDay - 1)
        const isToday = isSameDay(itemDate, now)
        
        if (isToday && item.startTime && item.endTime) {
          const [sh, sm] = (item.startTime || '00:00').split(':').map(Number)
          const [eh, em] = (item.endTime || '23:59').split(':').map(Number);
          const startMins = sh * 60 + sm
          const endMins = eh * 60 + em
          isLive = nowTimeMins >= startMins && nowTimeMins <= endMins
        }
      }
      return { ...item, isLive }
    })
  }, [places, trip.startDate, now])

  const days = useMemo(() => {
    let start, end
    switch (view) {
      case 'day': start = currentDate; end = currentDate; break
      case '3day': start = currentDate; end = addDays(currentDate, 2); break
      case 'week': start = startOfWeek(currentDate); end = endOfWeek(currentDate); break
      case 'month': start = startOfWeek(startOfMonth(currentDate)); end = endOfWeek(endOfMonth(currentDate)); break
      default: return []
    }
    return eachDayOfInterval({ start, end })
  }, [currentDate, view])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="flex flex-col h-full bg-neutral-900/20 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in duration-500">
      {/* Calendar Header */}
      <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-1.5 rounded-lg border border-white/20 text-white text-xs font-bold hover:bg-white/5 transition-all active:scale-95"
            >
              Today
            </button>
            <div className="flex items-center ml-2">
              <button onClick={() => navigate('prev')} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </button>
              <button onClick={() => navigate('next')} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>
            </div>
          </div>
          <h2 className="text-xl font-medium text-white tracking-tight">
            {view === 'year' ? format(currentDate, 'yyyy') : format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Day Selector */}
          <div className="relative group/day-select">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/20 transition-all">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                Day {getDayNumber(currentDate)}
              </span>
              <span className="material-symbols-outlined text-primary text-xs">arrow_drop_down</span>
            </button>
            <div className="absolute top-full right-0 mt-1 w-32 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl z-[110] opacity-0 translate-y-2 pointer-events-none group-hover/day-select:opacity-100 group-hover/day-select:translate-y-0 group-hover/day-select:pointer-events-auto transition-all overflow-hidden">
              <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                  <button
                    key={d}
                    onClick={() => jumpToDay(d)}
                    className={`w-full px-4 py-2 text-left text-[10px] font-bold transition-colors hover:bg-white/5 ${getDayNumber(currentDate) === d ? 'text-primary' : 'text-neutral-400'}`}
                  >
                    Day {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* View Selector */}
          <div className="relative group/view-select">
            <button className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition-all">
              {view === 'day' ? 'Day' : view === '3day' ? '3 Days' : view === 'week' ? 'Week' : view === 'month' ? 'Month' : 'Year'}
              <span className="material-symbols-outlined text-base">arrow_drop_down</span>
            </button>
            <div className="absolute top-full right-0 mt-1 w-32 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl z-[110] opacity-0 translate-y-2 pointer-events-none group-hover/view-select:opacity-100 group-hover/view-select:translate-y-0 group-hover/view-select:pointer-events-auto transition-all overflow-hidden">
              {(['day', '3day', 'week', 'month', 'year'] as ViewType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`w-full px-4 py-2.5 text-left text-xs font-medium hover:bg-white/5 transition-colors ${view === v ? 'text-primary' : 'text-neutral-400'}`}
                >
                  {v === 'day' ? 'Day' : v === '3day' ? '3 Days' : v === 'week' ? 'Week' : v === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        {view === 'year' ? (
           <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 custom-scrollbar">
            {eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) }).map((month) => (
              <div key={month.toString()} className="space-y-3">
                <h3 className="text-sm font-bold text-primary uppercase tracking-widest">{format(month, 'MMMM')}</h3>
                <div className="grid grid-cols-7 gap-1 text-[10px]">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-neutral-600 font-bold">{d}</div>
                  ))}
                  {eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }).map((day) => {
                    const isCurrentMonth = isSameMonth(day, month)
                    const dayNum = getDayNumber(day)
                    const dayPlaces = places.filter(p => p.day === dayNum || (dayNum > (p.day || 0) && dayNum <= (p.endDay || p.day || 0)))
                    const hasPlaces = dayPlaces.length > 0
                    
                    return (
                      <div key={day.toString()} className={`aspect-square flex flex-col items-center justify-center rounded-lg relative ${!isCurrentMonth ? 'opacity-20' : ''} ${hasPlaces ? 'bg-white/5' : ''}`}>
                        <span className={`text-[9px] ${hasPlaces ? 'text-white font-bold' : 'text-neutral-500'}`}>{format(day, 'd')}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : view === 'month' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-7 border-b border-white/10 sticky top-0 z-20 bg-black/60 backdrop-blur-xl">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="p-3 text-center text-[10px] font-black text-neutral-500 uppercase tracking-widest">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-full">
              {days.map((day) => {
                const dayNum = getDayNumber(day)
                const dayPlaces = places.filter(p => p.day === dayNum || (dayNum > (p.day || 0) && dayNum <= (p.endDay || p.day || 0)))
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isToday = isSameDay(day, new Date())

                return (
                  <div key={day.toString()} className={`min-h-[140px] border-r border-b border-white/5 p-1 transition-colors hover:bg-white/[0.02] group ${!isCurrentMonth ? 'bg-black/10 opacity-20' : ''}`}>
                    <div className="flex justify-between items-start p-1.5 mb-1">
                      <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${isToday ? 'bg-primary text-black shadow-[0_0_15px_rgba(143,245,255,0.5)]' : 'text-neutral-500'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {allItems.filter(item => {
                        const d = getDayNumber(day)
                        return d >= item.day && d <= item.endDay
                      }).slice(0, 4).map(item => {
                        const d = getDayNumber(day)
                        const isStart = d === item.day
                        const isEnd = d === item.endDay
                        const isMultiDay = item.day !== item.endDay

                        let roundingClass = 'rounded-md'
                        if (isMultiDay) {
                          if (isStart) roundingClass = 'rounded-l-md rounded-r-none'
                          else if (isEnd) roundingClass = 'rounded-r-md rounded-l-none'
                          else roundingClass = 'rounded-none'
                        }

                        // Add negative margin to connect across cell gaps
                        const marginClass = isMultiDay ? (isStart ? 'mr-[-8px] pr-3 z-10' : isEnd ? 'ml-[-8px] pl-3 z-10' : 'mx-[-8px] px-3 z-10') : ''

                        return (
                          <div 
                            key={`${item.id}-${item.type}-${dayNum}`} 
                            onClick={() => onPlaceClick(item.data)} 
                            className={`px-2 py-1 text-[9px] font-bold truncate cursor-pointer transition-all active:scale-[0.98] flex items-center gap-1.5 relative ${roundingClass} ${marginClass} ${getTypeStyles(item.type, item.isLive)}`}
                          >
                            {(isStart || !isMultiDay) && (
                              <span className="text-xs shrink-0">{item.emoji.length > 2 ? <span className="material-symbols-outlined text-[12px]">{item.emoji}</span> : item.emoji}</span>
                            )}
                            <span className="truncate">{(isStart || !isMultiDay) ? item.name : '\u00A0'}</span>
                            {item.isLive && isStart && <div className="w-1 h-1 bg-primary rounded-full animate-pulse ml-auto" />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header / Day Names */}
            <div className="flex border-b border-white/10 bg-black/40 backdrop-blur-xl z-30">
              <div className="w-16 shrink-0 border-r border-white/10" />
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                {days.map((day) => {
                  const isToday = isSameDay(day, new Date())
                  return (
                    <div key={day.toString()} className="p-3 flex flex-col items-center justify-center border-r border-white/5">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-primary' : 'text-neutral-500'}`}>{format(day, 'EEE')}</span>
                      <span className={`text-xl font-bold mt-1 ${isToday ? 'bg-primary text-black w-10 h-10 flex items-center justify-center rounded-full shadow-[0_0_20px_rgba(143,245,255,0.4)]' : 'text-white'}`}>{format(day, 'd')}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* All-day Events Section */}
            <div className="flex border-b border-white/10 bg-white/[0.02] min-h-[40px] z-20">
              <div className="w-16 shrink-0 border-r border-white/10 flex items-center justify-center">
                <span className="text-[8px] font-black text-neutral-600 uppercase tracking-tighter">All-day</span>
              </div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                {days.map((day) => {
                  const dayNum = getDayNumber(day)
                  const allDayItems = allItems.filter(item => 
                    item.allDay && dayNum >= item.day && dayNum <= item.endDay
                  )
                  return (
                    <div key={day.toString()} className="p-1 space-y-1 border-r border-white/5">
                      {allDayItems.map(item => (
                        <div key={`${item.id}-${item.type}-${dayNum}`} onClick={() => onPlaceClick(item.data)} className={`px-2 py-1 rounded border-l-2 text-[9px] font-bold truncate cursor-pointer hover:brightness-125 transition-all flex items-center gap-1.5 ${getTypeStyles(item.type, item.isLive)}`}>
                          {item.emoji && item.emoji.length > 2 ? (
                            <span className="material-symbols-outlined text-[12px]">{item.emoji}</span>
                          ) : (
                            <span>{item.emoji}</span>
                          )}
                          <span className="truncate">{item.name}</span>
                          {item.isLive && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse ml-auto" />}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Timed Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative flex bg-black/20">
              {/* Time Column */}
              <div className="w-16 shrink-0 border-r border-white/10 sticky left-0 z-10 bg-black/40 backdrop-blur-xl">
                {hours.map(h => (
                  <div key={h} className="h-12 border-b border-white/5 px-2 text-right">
                    <span className="text-[9px] font-black text-neutral-600 uppercase">
                      {format(new Date().setHours(h, 0), timeFormat === '12h' ? 'ha' : 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grid Content */}
              <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                {days.map((day) => {
                  const dayNum = getDayNumber(day)
                  const isToday = isSameDay(day, new Date())
                  const placeItems = allItems.filter(item => 
                    item.type === 'place' && !item.allDay && dayNum >= item.day && dayNum <= item.endDay &&
                    item.startTime && item.endTime
                  )
                  const timedItems = allItems.filter(item => 
                    item.type !== 'place' && !item.allDay && dayNum >= item.day && dayNum <= item.endDay &&
                    item.startTime && item.endTime
                  )
                  
                  const positionedItems = getEventPositions(timedItems)

                  return (
                    <div key={day.toString()} className="relative border-r border-white/5 min-h-[1152px]">
                      {/* Hour lines */}
                      {hours.map(h => (
                        <div key={h} className="h-12 border-b border-white/[0.03] w-full" />
                      ))}

                      {/* Now Indicator */}
                      {isToday && (
                        <div className="absolute left-0 right-0 z-30 pointer-events-none flex items-center" style={{ top: `${nowTop}px` }}>
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-[0_0_10px_#ef4444]" />
                          <div className="flex-1 h-px bg-red-500/60" />
                        </div>
                      )}

                      {/* Places Backgrounds */}
                      {placeItems.map(item => {
                        const [startH, startM] = (item.startTime || '00:00').split(':').map(Number)
                        const [endH, endM] = (item.endTime || '23:59').split(':').map(Number)
                        const top = (startH * 48) + (startM / 60 * 48)
                        const height = Math.max(24, ((endH * 48) + (endM / 60 * 48)) - top)

                        return (
                          <div 
                            key={`${item.type}-${item.id}-${dayNum}`}
                            onClick={() => onPlaceClick(item.data)}
                            className={`absolute rounded-lg border p-2 shadow-xl cursor-pointer hover:brightness-110 transition-all z-0 overflow-hidden ${getTypeStyles(item.type, item.isLive)}`}
                            style={{ 
                              top: `${top}px`, 
                              height: `${height}px`,
                              left: '0%',
                              width: '100%' 
                            }}
                          >
                            <div className="flex flex-col h-full">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] font-black truncate leading-none">{item.name}</span>
                              </div>
                              {height > 30 && (
                                <span className="text-[8px] font-bold opacity-60 mt-0.5">
                                  {formatTime(item.startTime, timeFormat)}
                                  {height > 45 && item.endTime && ` - ${formatTime(item.endTime, timeFormat)}`}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {/* Events */}
                      {positionedItems.map(item => {
                        const [startH, startM] = (item.startTime || '09:00').split(':').map(Number)
                        const [endH, endM] = (item.endTime || '10:00').split(':').map(Number)
                        const top = (startH * 48) + (startM / 60 * 48)
                        const height = Math.max(24, ((endH * 48) + (endM / 60 * 48)) - top)
                        
                        const left = (item.colIndex / item.totalCols) * 100
                        const width = (1 / item.totalCols) * 100

                        return (
                          <div 
                            key={`${item.type}-${item.id}-${dayNum}`}
                            onClick={() => onPlaceClick(item.data)}
                            className={`absolute rounded-lg border p-2 shadow-xl cursor-pointer hover:brightness-125 transition-all z-10 overflow-hidden ${getTypeStyles(item.type, item.isLive)}`}
                            style={{ 
                              top: `${top}px`, 
                              height: `${height}px`,
                              left: `${left + 2}%`, // Indent slightly so place background is visible
                              width: `${width - 3}%` 
                            }}
                          >
                            <div className="flex flex-col h-full">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="shrink-0 flex items-center justify-center">
                                  {item.emoji && item.emoji.length > 2 ? (
                                    <span className="material-symbols-outlined text-sm leading-none">{item.emoji}</span>
                                  ) : (
                                    <span className="text-xs leading-none">{item.emoji}</span>
                                  )}
                                </span>
                                <span className="text-[10px] font-black truncate leading-none">{item.name}</span>
                                {item.isLive && (
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse ml-auto" />
                                )}
                              </div>
                              {height > 30 && (
                                <span className="text-[8px] font-bold opacity-60 mt-0.5">
                                  {formatTime(item.startTime, timeFormat)}
                                  {height > 45 && item.endTime && ` - ${formatTime(item.endTime, timeFormat)}`}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-10 right-10 z-[100] no-print">
        <button
          onClick={() => onAddPlace(getDayNumber(currentDate))}
          className="w-14 h-14 rounded-full bg-primary text-slate-950 flex items-center justify-center shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-500 hover:scale-110 hover:shadow-primary/30 ring-4 ring-primary/10 active:scale-90"
        >
          <span className="material-symbols-outlined text-3xl font-bold">add</span>
        </button>
      </div>
    </div>
  )
}
