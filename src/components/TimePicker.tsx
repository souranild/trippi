'use client'

import { useState, useEffect, useRef } from 'react'
import { formatTime } from '@/lib/date-utils'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  className?: string
  placeholder?: string
  minTime?: string
  maxTime?: string
}

const HOURS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

function parse(value: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  if (!value) return { hour: '', minute: '', period: 'AM' }
  const m24 = value.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) {
    let h = parseInt(m24[1])
    const min = m24[2]
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
    if (h === 0) h = 12
    else if (h > 12) h -= 12
    return { hour: h.toString(), minute: min, period }
  }
  const m12 = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (m12) {
    return { hour: m12[1], minute: m12[2], period: m12[3].toUpperCase() as 'AM' | 'PM' }
  }
  return { hour: '', minute: '', period: 'AM' }
}

function fmt(hour: string, minute: string, period: 'AM' | 'PM'): string {
  return formatTime(`${hour}:${minute} ${period}`)
}

export default function TimePicker({ 
  value, 
  onChange, 
  className = '', 
  placeholder = 'Select time',
  minTime,
  maxTime
}: TimePickerProps) {
  const parsed = parse(value)
  const [isOpen, setIsOpen] = useState(false)
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period)
  const ref = useRef<HTMLDivElement>(null)

  // Sync external value changes (don't fire onChange)
  useEffect(() => {
    const p = parse(value)
    setHour(p.hour)
    setMinute(p.minute)
    setPeriod(p.period)
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const select = (h: string, m: string, p: 'AM' | 'PM') => {
    setHour(h); setMinute(m); setPeriod(p)
    if (h && m) onChange(fmt(h, m, p))
  }

  const displayValue = (hour && minute) ? fmt(hour, minute, period) : ''

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-left flex items-center justify-between hover:border-primary/50 focus:border-primary focus:outline-none transition-colors"
      >
        <span className={displayValue ? 'text-white font-medium' : 'text-neutral-500'}>
          {displayValue || placeholder}
        </span>
        <span className="material-symbols-outlined text-neutral-500" style={{ fontSize: '16px' }}>schedule</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-[200] mt-1 w-64 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* AM/PM toggle */}
          <div className="flex border-b border-white/10">
            {(['AM', 'PM'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p)
                  if (hour && minute) onChange(fmt(hour, minute, p))
                }}
                className={`flex-1 py-2 text-xs font-bold transition-colors ${
                  period === p ? 'bg-primary/20 text-primary' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex divide-x divide-white/10">
            {/* Hours */}
            <div className="flex-1 p-2">
              <p className="text-xs font-bold text-neutral-500 mb-2 text-center">Hour</p>
              <div className="grid grid-cols-3 gap-1">
                {HOURS.map(h => {
                  const isCurrent = hour === h
                  const toMins = (t: string) => {
                    const clean = t.replace(/\s*(AM|PM)/i, '').trim()
                    let [h, m] = clean.split(':').map(Number)
                    const isPM = t.toLowerCase().includes('pm')
                    const isAM = t.toLowerCase().includes('am')
                    if (isPM && h < 12) h += 12
                    else if (isAM && h === 12) h = 0
                    // If no AM/PM, assume it's already 24h or handle 12:xx as 12:xx
                    return h * 60 + m
                  }

                  const val24Mins = (parseInt(h) % 12 + (period === 'PM' ? 12 : 0)) * 60 + (parseInt(minute) || 0)
                  
                  let disabled = false
                  if (minTime) {
                    if (val24Mins < toMins(minTime)) {
                      // If we are checking HOURS, we only disable if the WHOLE hour is before minTime
                      // except we don't know the minutes yet if they aren't selected.
                      // Let's just compare the hour portions for the hour grid.
                      const h24 = (parseInt(h) % 12 + (period === 'PM' ? 12 : 0))
                      const minH24 = Math.floor(toMins(minTime) / 60)
                      if (h24 < minH24) disabled = true
                    }
                  }
                  if (maxTime) {
                    const h24 = (parseInt(h) % 12 + (period === 'PM' ? 12 : 0))
                    const maxH24 = Math.floor(toMins(maxTime) / 60)
                    if (h24 > maxH24) disabled = true
                  }

                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={disabled}
                      onClick={() => select(h, minute || '00', period)}
                      className={`py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        isCurrent ? 'bg-primary text-black' : disabled ? 'text-neutral-700 cursor-not-allowed opacity-30' : 'text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      {h}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Minutes */}
            <div className="flex-1 p-2">
              <p className="text-xs font-bold text-neutral-500 mb-2 text-center">Min</p>
              <div className="grid grid-cols-3 gap-1">
                {MINUTES.map(m => {
                  const isCurrent = minute === m
                  const currentH24 = hour ? (parseInt(hour) % 12) + (period === 'PM' ? 12 : 0) : -1
                  const currentTotalMins = currentH24 * 60 + parseInt(m)

                  const toMins = (t: string) => {
                    const clean = t.replace(/\s*(AM|PM)/i, '').trim()
                    let [h, m] = clean.split(':').map(Number)
                    const isPM = t.toLowerCase().includes('pm')
                    const isAM = t.toLowerCase().includes('am')
                    if (isPM && h < 12) h += 12
                    else if (isAM && h === 12) h = 0
                    return h * 60 + m
                  }
                  
                  let disabled = false
                  if (minTime && currentH24 !== -1) {
                    if (currentTotalMins < toMins(minTime)) disabled = true
                  }
                  if (maxTime && currentH24 !== -1) {
                    if (currentTotalMins > toMins(maxTime)) disabled = true
                  }

                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={disabled}
                      onClick={() => select(hour || '12', m, period)}
                      className={`py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        isCurrent ? 'bg-primary text-black' : disabled ? 'text-neutral-700 cursor-not-allowed opacity-30' : 'text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Clear + Done */}
          <div className="flex gap-2 p-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => { setHour(''); setMinute(''); onChange(''); setIsOpen(false) }}
              className="flex-1 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-[2] py-1.5 text-xs font-bold bg-primary text-black rounded-lg hover:bg-primary/80 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
