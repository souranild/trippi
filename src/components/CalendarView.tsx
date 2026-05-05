'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, subDays, addYears, subYears, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns'
import { formatTime } from '@/lib/date-utils'

interface CalendarViewProps {
  trip: any
  places: any[]
  onPlaceClick: (place: any) => void
  onAddPlace: (day: number) => void
  timeFormat?: '12h' | '24h'
}

type ViewType = 'day' | '3day' | 'week' | 'month' | 'year'

export default function CalendarView({ trip, places, onPlaceClick, onAddPlace, timeFormat = '12h' }: CalendarViewProps) {
  const tripStartDate = useMemo(() => new Date(trip?.startDate || new Date()), [trip?.startDate])
  const tripEndDate = useMemo(() => new Date(trip?.endDate || new Date()), [trip?.endDate])
  
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

  // Live time indicator logic
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const nowTop = useMemo(() => {
    return (now.getHours() * 48) + (now.getMinutes() / 60 * 48)
  }, [now])

  const days = useMemo(() => {
    let start, end
    switch (view) {
      case 'day':
        start = currentDate
        end = currentDate
        break
      case '3day':
        start = currentDate
        end = addDays(currentDate, 2)
        break
      case 'week':
        start = startOfWeek(currentDate)
        end = endOfWeek(currentDate)
        break
      case 'month':
        start = startOfWeek(startOfMonth(currentDate))
        end = endOfWeek(endOfMonth(currentDate))
        break
      default:
        return []
    }
    return eachDayOfInterval({ start, end })
  }, [currentDate, view])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="flex flex-col h-full bg-neutral-900/20 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in duration-500">
      {/* Calendar Header (GCal Style) */}
      <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const today = new Date()
                setCurrentDate(today)
              }}
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
          
          <div className="flex flex-col">
            <h2 className="text-xl font-medium text-white tracking-tight">
              {view === 'year' ? format(currentDate, 'yyyy') : format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              Day {getDayNumber(currentDate)}
            </span>
          </div>

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

          <button 
            onClick={() => document.getElementById('calendar-jump-date')?.showPicker()}
            className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-primary transition-all"
            title="Jump to date"
          >
            <span className="material-symbols-outlined text-xl">event</span>
            <input 
              type="date"
              className="w-0 h-0 opacity-0 absolute"
              id="calendar-jump-date"
              onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value))}
            />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {view === 'year' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
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
                    const hasPlaces = places.some(p => p.day === dayNum || (dayNum > (p.day || 0) && dayNum <= (p.endDay || p.day || 0)))
                    
                    return (
                      <div 
                        key={day.toString()} 
                        className={`aspect-square flex items-center justify-center rounded-md relative ${
                          !isCurrentMonth ? 'opacity-20' : ''
                        } ${hasPlaces ? 'bg-primary/20 text-primary font-bold' : 'text-neutral-400'}`}
                      >
                        {format(day, 'd')}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : view === 'month' ? (
          <div className="grid grid-cols-7 h-full min-h-[600px]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="p-3 text-center border-b border-white/10 text-[10px] font-bold text-neutral-500 uppercase tracking-widest bg-white/5">{d}</div>
            ))}
            {days.map((day) => {
              const dayNum = getDayNumber(day)
              const dayPlaces = places.filter(p => p.day === dayNum || (dayNum > (p.day || 0) && dayNum <= (p.endDay || p.day || 0)))
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isToday = isSameDay(day, new Date())

              return (
                <div 
                  key={day.toString()} 
                  className={`min-h-[120px] border-r border-b border-white/5 p-2 transition-colors hover:bg-white/[0.02] group ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold ${isToday ? 'w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_0_15px_rgba(143,245,255,0.5)]' : 'text-neutral-500'}`}>
                      {format(day, 'd')}
                    </span>
                    <button 
                      onClick={() => onAddPlace(dayNum)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/5 hover:bg-primary/20 hover:text-primary transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                  <div className="space-y-1">
                    {dayPlaces.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => onPlaceClick(p)}
                        className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold truncate cursor-pointer hover:bg-primary/20 transition-all"
                      >
                        {p.emoji} {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-[800px] overflow-x-auto no-scrollbar scroll-smooth">
            {/* Time Indicators */}
            <div className="w-14 sm:w-16 shrink-0 border-r border-white/10 bg-white/5 sticky left-0 z-30">
              <div className="h-12 border-b border-white/10" />
              {hours.map(h => (
                <div key={h} className="h-12 border-b border-white/5 p-1 sm:p-2 text-right bg-black/20 backdrop-blur-md">
                  <span className="text-[9px] sm:text-[10px] font-black text-neutral-500 uppercase">
                    {format(new Date().setHours(h, 0), timeFormat === '12h' ? 'ha' : 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            <div 
              className="flex-1 grid min-w-[300px] sm:min-w-0" 
              style={{ 
                gridTemplateColumns: `repeat(${days.length}, minmax(${view === 'day' ? '100%' : '140px'}, 1fr))`,
                minWidth: view === 'day' ? '100%' : `${days.length * 140}px`
              }}
            >
              {days.map((day) => {
                const dayNum = getDayNumber(day)
                const isToday = isSameDay(day, new Date())
                // Include places that start today OR are currently active from a previous start
                const dayPlaces = places.filter(p => p.day === dayNum || (dayNum > (p.day || 0) && dayNum <= (p.endDay || p.day || 0)))
                const timedPlaces = dayPlaces.filter(p => p.arrival && p.departure)
                const allDayPlaces = dayPlaces.filter(p => !p.arrival || !p.departure || (p.endDay && p.endDay > (p.day || 0)))
                
                // Identify a 'Main Focus' or 'Accommodation' for the day to serve as backdrop
                const backdropPlace = allDayPlaces.find(p => p.isAccommodation || p.name.toLowerCase().includes('hotel') || p.name.toLowerCase().includes('stay')) || allDayPlaces[0]
                const otherAllDay = allDayPlaces.filter(p => p.id !== backdropPlace?.id)

                return (
                  <div key={day.toString()} className="border-r border-white/10 relative group">
                    <div className={`h-14 border-b border-white/10 flex flex-col items-center justify-center bg-black/40 sticky top-0 z-20 backdrop-blur-md ${isToday ? 'after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary' : ''}`}>
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${isToday ? 'text-primary' : 'text-neutral-500'}`}>{format(day, 'EEE')}</span>
                      <div className={`text-lg font-normal transition-all ${isToday ? 'text-primary' : 'text-white'}`}>
                        {format(day, 'd')}
                      </div>
                    </div>

                    {/* All-day Section */}
                    <div className="min-h-[20px] border-b border-white/10 bg-white/[0.02] p-1 space-y-1">
                      {otherAllDay.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => onPlaceClick(p)}
                          className="px-2 py-0.5 rounded bg-primary text-black text-[9px] font-black truncate cursor-pointer hover:opacity-80 transition-all shadow-sm"
                        >
                          {p.emoji} {p.name}
                        </div>
                      ))}
                    </div>

                    <div className="relative h-full bg-white/[0.01]">
                      {/* Day Backdrop Place */}
                      {backdropPlace && (
                        <div 
                          className="absolute inset-0 z-0 opacity-[0.15] sm:opacity-[0.18] pointer-events-none p-2 sm:p-4 overflow-hidden flex flex-col justify-center items-center text-center select-none"
                          onClick={() => onPlaceClick(backdropPlace)}
                        >
                           <div className="flex flex-col items-center gap-1 sm:gap-2 max-w-full">
                             <span className="text-3xl sm:text-6xl drop-shadow-2xl">{backdropPlace.emoji}</span>
                             <h3 className="text-lg sm:text-3xl font-black uppercase tracking-tight sm:tracking-tighter text-white leading-tight break-words px-2">{backdropPlace.name}</h3>
                             <div className="h-px w-12 bg-white/20 my-1 hidden sm:block" />
                             {backdropPlace.location && (
                               <p className="text-[8px] sm:text-[11px] font-black text-white/60 uppercase tracking-widest hidden sm:line-clamp-2">{backdropPlace.location}</p>
                             )}
                           </div>
                        </div>
                      )}
                      {/* Current Time Line */}
                      {isToday && (
                        <div 
                          className="absolute left-0 right-0 z-[15] pointer-events-none flex items-center"
                          style={{ top: `${nowTop}px` }}
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                          <div className="flex-1 h-px bg-red-500/60 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                        </div>
                      )}

                      {/* Hour grids */}
                      {hours.map(h => (
                        <div key={h} className="h-12 border-b border-white/[0.03] group/hour relative">
                          <div className="absolute top-1/2 left-0 right-0 h-[0.5px] border-t border-dashed border-white/[0.01] pointer-events-none" />
                        </div>
                      ))}

                      {/* Timed Places */}
                      {timedPlaces.map(p => {
                        const [startH, startM] = (p.arrival || '09:00').split(':').map(Number)
                        const [endH, endM] = (p.departure || '17:00').split(':').map(Number)
                        const top = (startH * 48) + (startM / 60 * 48)
                        const height = Math.max(32, ((endH * 48) + (endM / 60 * 48)) - top)
                        
                        const colorClass = p.isTransport 
                          ? 'bg-blue-600/40 border-blue-400/50 text-blue-50' 
                          : p.isAccommodation 
                          ? 'bg-emerald-600/40 border-emerald-400/50 text-emerald-50'
                          : 'bg-primary/40 border-primary/50 text-white'

                        return (
                          <div 
                            key={p.id}
                            onClick={() => onPlaceClick(p)}
                            className={`absolute left-[2px] right-[2px] rounded-md border px-2 py-1.5 shadow-md cursor-pointer hover:brightness-125 transition-all z-10 overflow-hidden ${colorClass}`}
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <div className="flex flex-col h-full overflow-hidden">
                              <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
                                <span className="text-xs shrink-0">{p.emoji}</span>
                                <p className="text-[10px] font-bold truncate leading-none">{p.name}</p>
                              </div>
                              
                              {height > 40 && (
                                <p className="text-[9px] opacity-80 font-medium truncate leading-none">
                                  {formatTime(p.arrival, timeFormat)} - {formatTime(p.departure, timeFormat)}
                                </p>
                              )}
                              
                              {height > 80 && p.location && (
                                <div className="mt-1.5 flex items-center gap-1 opacity-70">
                                  <span className="material-symbols-outlined text-[10px]">location_on</span>
                                  <p className="text-[9px] truncate">{p.location}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      <button 
                        onClick={() => onAddPlace(dayNum)}
                        className="absolute inset-x-0 bottom-4 mx-auto w-10 h-10 rounded-full bg-primary text-black opacity-0 group-hover:opacity-100 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      >
                        <span className="material-symbols-outlined">add</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Add Button for Calendar Mode */}
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
