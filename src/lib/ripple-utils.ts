/**
 * Utility functions for time manipulation and the ripple effect.
 */

/**
 * Converts "HH:mm" to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  if (!time) return 0
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return 0
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

/**
 * Converts minutes since midnight to "HH:mm".
 */
export function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440 // Handle negative minutes
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
}

/**
 * Adds a delta (in minutes) to an "HH:mm" time string.
 */
export function shiftTime(time: string, deltaMinutes: number): string {
  if (!time) return ''
  const current = timeToMinutes(time)
  return minutesToTime(current + deltaMinutes)
}

/**
 * Calculates the difference in minutes between two "HH:mm" time strings (b - a).
 */
export function getTimeDelta(a: string, b: string): number {
  if (!a || !b) return 0
  return timeToMinutes(b) - timeToMinutes(a)
}
