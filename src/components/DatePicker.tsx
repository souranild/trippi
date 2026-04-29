'use client'

import React, { useState, useEffect, useRef } from 'react'
import { formatDate } from '@/lib/date-utils'

interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  buttonClassName?: string
}

export default function DatePicker({ 
  value, 
  onChange, 
  placeholder = 'Select date', 
  className = '',
  buttonClassName = ''
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  // Current selected date parts
  const selectedDate = value ? new Date(value) : null
  
  const currentMonth = viewDate.getMonth()
  const currentYear = viewDate.getFullYear()

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const handleDateSelect = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    // Format as YYYY-MM-DD (handling timezone)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    onChange(`${yyyy}-${mm}-${dd}`)
    setIsOpen(false)
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    return selectedDate.getDate() === day && 
           selectedDate.getMonth() === currentMonth && 
           selectedDate.getFullYear() === currentYear
  }

  const isToday = (day: number) => {
    const today = new Date()
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear
  }

  // Days to show in the grid
  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
  const blanks = Array(firstDay).fill(null)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Display value for the button
  const formattedValue = selectedDate 
    ? formatDate(value)
    : ''

  // Import for formatDate at the top


  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm text-white text-sm text-left flex items-center justify-between hover:bg-white/20 transition-all focus:border-primary focus:outline-none"}
      >
        <span className={formattedValue ? 'text-white' : 'text-white/50'}>
          {formattedValue || placeholder}
        </span>
        <span className="material-symbols-outlined text-white/50" style={{ fontSize: '16px' }}>calendar_today</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-[280px] rounded-2xl border border-white/20 bg-neutral-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button 
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </button>
              
              <div className="flex items-center gap-1 group">
                <div className="text-sm font-bold text-white uppercase tracking-widest px-2 py-1 rounded-lg">
                  {months[currentMonth]}
                </div>
                <select
                  value={currentYear}
                  onChange={(e) => setViewDate(new Date(parseInt(e.target.value), currentMonth, 1))}
                  className="bg-transparent text-sm font-bold text-primary uppercase tracking-widest focus:outline-none cursor-pointer hover:bg-white/5 px-1 py-1 rounded appearance-none"
                >
                  {Array.from({ length: 20 }, (_, i) => currentYear - 10 + i).map(year => (
                    <option key={year} value={year} className="bg-neutral-900 text-white">{year}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-[12px] text-primary/50 group-hover:text-primary">expand_more</span>
              </div>

              <button 
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>
            </div>

            {/* Days Column Headers */}
            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-black text-white/30 uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {days.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`
                    w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-all
                    ${isSelected(day) 
                      ? 'bg-primary text-black font-bold shadow-lg shadow-primary/20 scale-110' 
                      : isToday(day)
                        ? 'border border-primary/50 text-primary'
                        : 'text-white hover:bg-white/10'
                    }
                  `}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Today Link */}
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                const yyyy = today.getFullYear()
                const mm = String(today.getMonth() + 1).padStart(2, '0')
                const dd = String(today.getDate()).padStart(2, '0')
                onChange(`${yyyy}-${mm}-${dd}`)
                setIsOpen(false)
              }}
              className="text-[10px] font-black text-primary uppercase text-center tracking-widest pt-2 hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
