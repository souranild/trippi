/**
 * Shared utility functions for consistent date and time formatting across the app.
 */

// Format: Oct 25, 2026
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Format: OCT 25 (MON)
export function formatDateShort(dateStr: string | Date): string {
  if (!dateStr) return ''
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(date.getTime())) return String(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  }).toUpperCase()
}

// Format: 10:30 AM or 10:30
export function formatTime(timeStr: string, format: '12h' | '24h' = '12h'): string {
  if (!timeStr) return ''
  
  // Handle HH:mm format
  const m24 = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) {
    if (format === '24h') {
      return `${m24[1].padStart(2, '0')}:${m24[2]}`
    }
    let h = parseInt(m24[1])
    const min = m24[2]
    const period = h >= 12 ? 'PM' : 'AM'
    if (h === 0) h = 12
    else if (h > 12) h -= 12
    return `${h}:${min} ${period}`
  }
  
  // Already in 12h format?
  const m12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (m12) {
    if (format === '24h') {
      let h = parseInt(m12[1])
      const min = m12[2]
      const period = m12[3].toUpperCase()
      if (period === 'PM' && h < 12) h += 12
      if (period === 'AM' && h === 12) h = 0
      return `${h.toString().padStart(2, '0')}:${min}`
    }
    return timeStr.toUpperCase()
  }
  
  return timeStr
}

// Format: Oct 25 - Nov 2, 2026
export function formatDuration(start: string, end?: string): string {
  if (!start) return ''
  const d1 = new Date(start)
  if (isNaN(d1.getTime())) return start
  
  if (!end) return formatDate(start)
  
  const d2 = new Date(end)
  if (isNaN(d2.getTime())) return formatDate(start)
  
  const sameYear = d1.getFullYear() === d2.getFullYear()
  const sameMonth = d1.getMonth() === d2.getMonth() && sameYear
  
  if (sameYear) {
    if (sameMonth) {
      // Oct 25 - 30, 2026
      return `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${d2.getDate()}, ${d1.getFullYear()}`
    }
    // Oct 25 - Nov 2, 2026
    return `${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${d2.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d1.getFullYear()}`
  }
  
  // Oct 25, 2025 - Jan 2, 2026
  return `${formatDate(start)} - ${formatDate(end)}`
}

// Format: Day 1 (Mon, Oct 25)
export function getDayInfo(tripStartDate: string, dayNumber: number) {
  if (!tripStartDate) return { dayName: `Day ${dayNumber}`, dateStr: '', full: `Day ${dayNumber}` }
  const date = new Date(tripStartDate)
  const d = new Date(date.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000)
  
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  
  return {
    dayName,
    dateStr,
    full: `Day ${dayNumber} (${dayName}, ${dateStr})`
  }
}

export function getDayWithDate(tripStartDate: string, dayNumber: number): string {
  return getDayInfo(tripStartDate, dayNumber).full
}
