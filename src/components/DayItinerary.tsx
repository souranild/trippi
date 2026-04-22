'use client'

import { useState } from 'react'
import { DayItinerary, Attachment } from '@/lib/storage'

interface DayItineraryProps {
  itinerary: DayItinerary[]
  onAddAttachment?: (dayNumber: number, type: Attachment['type']) => void
  onEditAttachment?: (attachment: Attachment, dayNumber: number) => void
  onDeleteAttachment?: (attachmentId: string, dayNumber: number) => void
}

function getAttachmentIcon(type: Attachment['type']): string {
  switch (type) {
    case 'event': return '📅'
    case 'transport': return '✈️'
    case 'place': return '📍'
    case 'accommodation': return '🏨'
    case 'note': return '📝'
    default: return '📌'
  }
}

function getAttachmentTitle(attachment: Attachment): string {
  if (attachment.type === 'transport') {
    return `${attachment.from} → ${attachment.to}`
  }
  return attachment.title || 'Untitled'
}

export default function DayIteraryView({
  itinerary,
  onAddAttachment,
  onEditAttachment,
  onDeleteAttachment
}: DayItineraryProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    new Set([itinerary[0]?.day])
  )

  const toggleDay = (dayNumber: number) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayNumber)) {
      newExpanded.delete(dayNumber)
    } else {
      newExpanded.add(dayNumber)
    }
    setExpandedDays(newExpanded)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-2">
      {itinerary.map((day) => (
        <div key={day.day} className="border border-neutral-700 rounded-lg overflow-hidden">
          {/* Day Header */}
          <button
            onClick={() => toggleDay(day.day)}
            className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-neutral-800/50 hover:bg-neutral-800 transition-colors flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                {day.day}
              </div>
              <div className="text-left">
                <div className="font-bold text-white">Day {day.day}</div>
                <div className="text-xs sm:text-sm text-neutral-400">{formatDate(day.date)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-neutral-400">
                {day.attachments.length} items
              </span>
              <span className="material-symbols-outlined text-neutral-400 group-hover:text-primary transition-colors transform group-hover:translate-y-0.5">
                {expandedDays.has(day.day) ? 'expand_less' : 'expand_more'}
              </span>
            </div>
          </button>

          {/* Day Content */}
          {expandedDays.has(day.day) && (
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-surface-container space-y-2">
              {day.attachments.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <p className="mb-4">No activities yet</p>
                  <button
                    onClick={() => onAddAttachment?.(day.day, 'event')}
                    className="text-xs px-3 py-2 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                  >
                    + Add Activity
                  </button>
                </div>
              ) : (
                <>
                  {day.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="bg-neutral-800 rounded p-3 sm:p-4 hover:bg-neutral-800/80 transition-colors group cursor-pointer"
                      onClick={() => onEditAttachment?.(attachment, day.day)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg sm:text-xl flex-shrink-0">
                          {getAttachmentIcon(attachment.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm sm:text-base line-clamp-2">
                            {getAttachmentTitle(attachment)}
                          </div>
                          {attachment.description && (
                            <div className="text-xs sm:text-sm text-neutral-400 line-clamp-2 mt-1">
                              {attachment.description}
                            </div>
                          )}
                          {attachment.startTime && (
                            <div className="text-xs text-neutral-500 mt-1">
                              🕐 {attachment.startTime}
                              {attachment.endTime && ` - ${attachment.endTime}`}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteAttachment?.(attachment.id, day.day)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded text-red-400"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add button below items */}
                  <div className="flex gap-2 pt-2 border-t border-neutral-700">
                    <button
                      onClick={() => onAddAttachment?.(day.day, 'event')}
                      className="flex-1 text-xs py-2 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      + Event
                    </button>
                    <button
                      onClick={() => onAddAttachment?.(day.day, 'transport')}
                      className="flex-1 text-xs py-2 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      + Transport
                    </button>
                    <button
                      onClick={() => onAddAttachment?.(day.day, 'place')}
                      className="flex-1 text-xs py-2 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      + Place
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
