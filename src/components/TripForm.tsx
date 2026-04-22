'use client'

import { useState, useEffect, useRef } from 'react'
import { searchWallpapers, getRandomPlaceholder } from '@/lib/wallpaper-search'

const emojis = [
  '✈️', '🏖️', '🏔️', '🏙️', '🌴', '🏰', '🗽', '🗼', '🎭', '🍜', '🏃', '🎨', '🎵', '🍷', '🏂', '🚀',
  '🌍', '🏕️', '🏝️', '🌄', '🌅', '🏞️', '🏜️', '🏯', '🕌', '⛩️', '🏛️', '🎡', '🎢', '🎠', '🏟️', '🎪',
  '🍕', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '⛳', '🏹',
  '🎸', '🎹', '🥁', '🎷', '🎺', '🪕', '🎻', '🎤', '🎧', '🎼', '🎶', '🎙️', '🎚️', '🎛️', '🎯',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲',
  '⛵', '🛶', '🚤', '🛳️', '⛴️', '🚢', '🛩️', '🛫', '🛬', '🚁', '🚟', '🚠', '🚡', '🛤️', '🛸'
]

interface TripFormProps {
  initialValues?: {
    emoji?: string
    title?: string
    description?: string
    startDate?: string
    endDate?: string
    wallpaper?: string
  }
  onSubmit: (data: {
    emoji: string
    title: string
    description: string
    startDate: string
    endDate: string
    wallpaper: string
  }) => void
  onCancel: () => void
  isSubmitting?: boolean
  submitButtonText?: string
  onEmojiPickerToggle?: (isOpen: boolean) => void
  onWallpaperPickerToggle?: (isOpen: boolean) => void
}

export default function TripForm({
  initialValues = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = 'Create Trip',
  onEmojiPickerToggle,
  onWallpaperPickerToggle
}: TripFormProps) {
  const [emoji, setEmoji] = useState(initialValues.emoji || '')

  // Set random emoji on mount if none provided
  useEffect(() => {
    if (!initialValues.emoji) {
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
      setEmoji(randomEmoji)
    }
  }, [initialValues.emoji])
  const [title, setTitle] = useState(initialValues.title || '')
  const [description, setDescription] = useState(initialValues.description || '')
  const [startDate, setStartDate] = useState(initialValues.startDate || '')
  const [endDate, setEndDate] = useState(initialValues.endDate || '')
  const [wallpaper, setWallpaper] = useState(initialValues.wallpaper || '')
  const [wallpaperOpacity, setWallpaperOpacity] = useState(0)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [isWallpaperPickerOpen, setIsWallpaperPickerOpen] = useState(false)
  const [wallpaperSearchQuery, setWallpaperSearchQuery] = useState('')
  const [wallpaperSearchResults, setWallpaperSearchResults] = useState<string[]>([])
  const [isWallpaperSearching, setIsWallpaperSearching] = useState(false)
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null)

  // Set initial wallpaper on mount
  useEffect(() => {
    if (!initialValues.wallpaper) {
      const placeholder = getRandomPlaceholder()
      setWallpaperOpacity(0)
      setWallpaper(placeholder)
      const timer = setTimeout(() => setWallpaperOpacity(1), 50)
      return () => clearTimeout(timer)
    } else {
      setWallpaperOpacity(1)
    }
  }, [initialValues.wallpaper])

  useEffect(() => {
    onEmojiPickerToggle?.(isEmojiPickerOpen)
  }, [isEmojiPickerOpen, onEmojiPickerToggle])

  useEffect(() => {
    onWallpaperPickerToggle?.(isWallpaperPickerOpen)
  }, [isWallpaperPickerOpen, onWallpaperPickerToggle])

  const handleWallpaperSearch = async (query: string) => {
    if (!query.trim()) {
      setWallpaperSearchResults([])
      return
    }

    try {
      setIsWallpaperSearching(true)
      const urls = await searchWallpapers(query)
      setWallpaperSearchResults(urls)
    } catch (error) {
      console.error('Failed to search wallpapers:', error)
      setWallpaperSearchResults([])
    } finally {
      setIsWallpaperSearching(false)
    }
  }

  const handleWallpaperPickerOpen = () => {
    setIsWallpaperPickerOpen(true)
    const searchQuery = title.trim() || 'travel'
    setWallpaperSearchQuery(searchQuery)
    setWallpaperSearchResults([])
    setTimeout(() => {
      handleWallpaperSearch(searchQuery)
    }, 0)
  }

  useEffect(() => {
    if (isWallpaperPickerOpen && wallpaperInputRef.current) {
      wallpaperInputRef.current.focus()
    }
  }, [isWallpaperPickerOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !emoji || !startDate) return

    onSubmit({
      emoji,
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      wallpaper
    })
  }

  const isFormValid = Boolean(title.trim() && emoji && startDate)

  return (
    <div className="space-y-6">
      {/* Emoji Picker Modal */}
      {isEmojiPickerOpen && (
        <div className="modal-backdrop p-4 md:p-8 animate-in fade-in duration-300">
          <div className="modal-container w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 p-6 border-b border-neutral-700 bg-white/5 backdrop-blur-xl">
              <button
                onClick={() => setIsEmojiPickerOpen(false)}
                className="w-10 h-10 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-all duration-300 active:scale-95 shadow-lg"
                aria-label="Back"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
              <h2 className="text-2xl font-bold text-white font-headline">Choose Trip Emoji</h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-10 gap-3">
                {emojis.map((e, index) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setEmoji(e)
                      setIsEmojiPickerOpen(false)
                    }}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all hover:scale-110 hover:shadow-lg animate-in slide-in-from-bottom-2 duration-300 ${
                      emoji === e
                        ? 'bg-primary text-black shadow-lg scale-110'
                        : 'bg-surface-container-highest text-white hover:bg-neutral-700'
                    }`}
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-neutral-700 bg-surface-container-highest">
              <button
                onClick={() => setIsEmojiPickerOpen(false)}
                className="w-full py-2 text-neutral-400 hover:bg-neutral-800/50 transition-colors rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallpaper Picker Modal */}
      {isWallpaperPickerOpen && (
        <div className="modal-backdrop p-4 md:p-8 animate-in fade-in duration-300">
          <div className="modal-container w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-500 flex flex-col">
            <div className="flex items-center gap-4 p-6 border-b border-neutral-700 bg-white/5 backdrop-blur-xl flex-shrink-0">
              <button
                onClick={() => setIsWallpaperPickerOpen(false)}
                className="w-10 h-10 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-800/60 hover:text-white transition-all duration-300 active:scale-95 shadow-lg"
                aria-label="Back"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
              <h2 className="text-heading-2 text-white">Choose Trip Wallpaper</h2>
            </div>

            <div className="p-6 border-b border-neutral-700 flex-shrink-0">
              <div className="relative">
                <input
                  ref={wallpaperInputRef}
                  type="text"
                  value={wallpaperSearchQuery}
                  onChange={(e) => setWallpaperSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleWallpaperSearch(wallpaperSearchQuery || 'travel')
                    }
                  }}
                  placeholder="Search for wallpapers (e.g., mountains, beach, city)..."
                  className="w-full rounded-xl border border-neutral-700 bg-surface-container-highest px-4 py-3 pr-12 text-white placeholder-neutral-400 focus:border-primary outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleWallpaperSearch(wallpaperSearchQuery || 'travel')}
                  disabled={isWallpaperSearching}
                  className="absolute right-3 top-3 text-neutral-400 hover:text-white disabled:opacity-50"
                >
                  {isWallpaperSearching ? (
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined">search</span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {wallpaperSearchResults.length === 0 && !isWallpaperSearching && (
                <div className="text-center py-12">
                  <p className="text-neutral-500 text-sm">No wallpapers loaded yet. Try searching for something!</p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {wallpaperSearchResults.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => {
                      setWallpaper(url)
                      setIsWallpaperPickerOpen(false)
                    }}
                    className={`relative aspect-video rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-lg animate-in slide-in-from-bottom-2 duration-300 ${
                      wallpaper === url ? 'ring-4 ring-primary scale-105' : ''
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <img
                      src={url}
                      alt={`Wallpaper ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {wallpaper === url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-white">check_circle</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-neutral-700 bg-surface-container-highest flex-shrink-0">
              <div className="flex justify-between items-center">
                <p className="text-neutral-400 text-sm">Choose a beautiful background for your trip</p>
                <button
                  onClick={() => setIsWallpaperPickerOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:bg-neutral-800/50 transition-colors rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{
          backgroundImage: wallpaper ? `url(${wallpaper})` : `url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop)`,
          opacity: wallpaperOpacity,
        }}
      />
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Form */}
      <form onSubmit={handleSubmit} className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-x-3 sm:grid-cols-[4rem_1fr_4rem] sm:gap-x-5">
            <div className="flex h-16 w-14 items-center justify-center sm:w-16">
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen(true)}
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl transition-all hover:scale-105 sm:h-16 sm:w-16 sm:text-4xl ${
                  emoji
                    ? 'bg-white/20 hover:bg-white/30'
                    : 'border-2 border-dashed border-white/30 bg-white/10 hover:bg-white/20'
                }`}
              >
                {emoji || '😊'}
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Trip name..."
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm text-white placeholder-white/50 focus:border-primary focus:outline-none transition-colors"
              />
              <div className="flex gap-2 text-xs text-white/60">
                <span>Click to change emoji</span>
              </div>
            </div>

            <div className="flex h-16 w-14 items-center justify-center sm:w-16">
              <button
                type="button"
                onClick={handleWallpaperPickerOpen}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-white/30 bg-white/10 text-white transition-all hover:scale-105 hover:bg-white/20 sm:h-16 sm:w-16"
              >
                <span className="material-symbols-outlined text-2xl sm:text-3xl">wallpaper</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6">Trip Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about your trip..."
                rows={3}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm text-white placeholder-white/50 focus:border-primary focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-2">End Date (Optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary btn-md flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="btn-primary btn-md flex-1 text-xs shadow-primary/20"
              >
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                {isSubmitting ? 'Creating...' : submitButtonText}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
