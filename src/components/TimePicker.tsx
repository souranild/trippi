'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  className?: string
  placeholder?: string
}

export default function TimePicker({ value, onChange, className = '', placeholder = 'Select time' }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState('')
  const [selectedMinute, setSelectedMinute] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('AM')
  const pickerRef = useRef<HTMLDivElement>(null)

  // Parse initial value using useMemo to avoid setState in effect
  const parsedTime = useMemo(() => {
    if (value) {
      const [time, period] = value.split(' ')
      if (time && period) {
        const [hour, minute] = time.split(':')
        return { hour, minute, period }
      } else {
        // Handle 24-hour format
        const [hour, minute] = value.split(':')
        const hourNum = parseInt(hour)
        return {
          hour: hourNum > 12 ? (hourNum - 12).toString() : hour === '0' ? '12' : hour,
          minute,
          period: hourNum >= 12 ? 'PM' : 'AM'
        }
      }
    }
    return { hour: '', minute: '', period: 'AM' }
  }, [value])

  // Initialize state from parsed value
  useEffect(() => {
    setSelectedHour(parsedTime.hour)
    setSelectedMinute(parsedTime.minute)
    setSelectedPeriod(parsedTime.period)
  }, [parsedTime])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Prevent page scroll when picker is open (but allow wheel events on picker)
    const preventScroll = (e: WheelEvent | TouchEvent) => {
      if (isOpen && !pickerRef.current?.contains(e.target as Node)) {
        e.preventDefault()
      }
    }

    const preventKeyScroll = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End')) {
        e.preventDefault()
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('wheel', preventScroll, { passive: false })
      document.addEventListener('touchmove', preventScroll, { passive: false })
      document.addEventListener('keydown', preventKeyScroll)
    } else {
      document.body.style.overflow = ''
      document.removeEventListener('wheel', preventScroll)
      document.removeEventListener('touchmove', preventScroll)
      document.removeEventListener('keydown', preventKeyScroll)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
      document.removeEventListener('wheel', preventScroll)
      document.removeEventListener('touchmove', preventScroll)
      document.removeEventListener('keydown', preventKeyScroll)
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedHour && selectedMinute) {
      const timeString = `${selectedHour}:${selectedMinute} ${selectedPeriod}`
      if (timeString !== value) {
        onChange(timeString)
      }
    }
  }, [selectedHour, selectedMinute, selectedPeriod, value, onChange])

  const handleTimeSelect = () => {
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelectedHour('')
    setSelectedMinute('')
    setSelectedPeriod('AM')
    onChange('')
    setIsOpen(false)
  }

  const displayValue = value || placeholder

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString())
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
  const periods = ['AM', 'PM']

  const wheelStyles = "flex flex-col items-center flex-1"
  const wheelContainerStyles = "relative h-32 w-full overflow-hidden bg-neutral-800/50 rounded-2xl border border-white/5"
  const wheelCenterStyles = "absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
  const wheelHighlightStyles = "h-10 w-full border-t border-b border-primary/30 bg-primary/5"
  const scrollContainerStyles = "h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-20"

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-[1.25rem] text-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all text-left flex items-center justify-between group"
      >
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5 group-hover:text-primary transition-colors">Time</span>
          <span className={`text-base font-bold italic ${value ? 'text-white' : 'text-neutral-400'}`}>
            {displayValue}
          </span>
        </div>
        <span className="material-symbols-outlined text-neutral-500 group-hover:text-primary transition-colors">schedule</span>
      </button>

      {/* Picker Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-[#1a1a1a] border border-white/10 rounded-[2rem] shadow-2xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Wheel Picker */}
          <div className="p-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              {/* Hours Wheel */}
              <div className={wheelStyles}>
                <label className="text-[10px] font-black text-neutral-500 uppercase mb-2 tracking-widest">Hour</label>
                <div className={wheelContainerStyles}>
                  <div className={wheelCenterStyles}>
                    <div className={wheelHighlightStyles}></div>
                  </div>
                  <div 
                    className={scrollContainerStyles}
                    onScroll={(e) => {
                      const container = e.currentTarget
                      const index = Math.round(container.scrollTop / 40)
                      if (hours[index] && hours[index] !== selectedHour) {
                        setSelectedHour(hours[index])
                      }
                    }}
                  >
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        onClick={() => setSelectedHour(hour)}
                        className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-all select-none text-lg font-bold italic ${
                          selectedHour === hour
                            ? 'text-primary scale-110'
                            : 'text-neutral-500 hover:text-white'
                        }`}
                      >
                        {hour}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Minutes Wheel */}
              <div className={wheelStyles}>
                <label className="text-[10px] font-black text-neutral-500 uppercase mb-2 tracking-widest">Min</label>
                <div className={wheelContainerStyles}>
                  <div className={wheelCenterStyles}>
                    <div className={wheelHighlightStyles}></div>
                  </div>
                  <div 
                    className={scrollContainerStyles}
                    onScroll={(e) => {
                      const container = e.currentTarget
                      const index = Math.round(container.scrollTop / 40)
                      if (minutes[index] && minutes[index] !== selectedMinute) {
                        setSelectedMinute(minutes[index])
                      }
                    }}
                  >
                    {minutes.map((minute) => (
                      <div
                        key={minute}
                        onClick={() => setSelectedMinute(minute)}
                        className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-all select-none text-lg font-bold italic ${
                          selectedMinute === minute
                            ? 'text-primary scale-110'
                            : 'text-neutral-500 hover:text-white'
                        }`}
                      >
                        {minute}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AM/PM Wheel */}
              <div className={wheelStyles}>
                <label className="text-[10px] font-black text-neutral-500 uppercase mb-2 tracking-widest">AM/PM</label>
                <div className={wheelContainerStyles}>
                  <div className={wheelCenterStyles}>
                    <div className={wheelHighlightStyles}></div>
                  </div>
                  <div 
                    className={scrollContainerStyles}
                    onScroll={(e) => {
                      const container = e.currentTarget
                      const index = Math.round(container.scrollTop / 40)
                      if (periods[index] && periods[index] !== selectedPeriod) {
                        setSelectedPeriod(periods[index])
                      }
                    }}
                  >
                    {periods.map((period) => (
                      <div
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-all select-none text-lg font-bold italic ${
                          selectedPeriod === period
                            ? 'text-primary scale-110'
                            : 'text-neutral-500 hover:text-white'
                        }`}
                      >
                        {period}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-white/5">
              <button
                onClick={handleClear}
                className="flex-1 px-6 py-3 text-neutral-400 hover:bg-white/5 transition-colors rounded-2xl font-bold uppercase tracking-widest text-[10px]"
              >
                Clear
              </button>
              <button
                onClick={handleTimeSelect}
                className="flex-[2] px-6 py-3 bg-primary text-black hover:bg-primary/90 transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
              >
                Done
              </button>
              <button
                onClick={handleTimeSelect}
                disabled={!selectedHour || !selectedMinute}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 disabled:bg-neutral-700 disabled:text-neutral-500 text-white transition-colors rounded-lg font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}