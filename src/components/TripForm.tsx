'use client'

import { useState, useEffect, useRef } from 'react'
import { searchWallpapers, getRandomPlaceholder } from '@/lib/wallpaper-search'
import { applySkinTone } from '@/lib/emoji-categories'
import ParallaxBackground from './ParallaxBackground'

import { useTrips } from '@/context/TripContext'
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '@/components/ModalLayout'
import EmojiPicker from './EmojiPicker'
import DatePicker from './DatePicker'
import { ConfirmationModal } from './ConfirmationModal'

const defaultEmojis = [
  '✈️', '🏖️', '🏔️', '🏙️', '🌴', '🏰', '🗽', '🗼', '🎭', '🍜', '🏃', '🎨', '🎵', '🍷', '🏂', '🚀'
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
  hideBackground?: boolean
  hideActions?: boolean
  compact?: boolean
  onWallpaperChange?: (url: string) => void
  onDelete?: () => void
  onValidationChange?: (isValid: boolean) => void
}

export default function TripForm({
  initialValues = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = 'Create Trip',
  onEmojiPickerToggle,
  onWallpaperPickerToggle,
  hideBackground = false,
  hideActions = false,
  compact = false,
  onWallpaperChange,
  onDelete,
  onValidationChange,
}: TripFormProps) {
  const { userProfile } = useTrips()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [emoji, setEmoji] = useState(initialValues.emoji || '')
  const [skinTone, setSkinTone] = useState(userProfile?.skinTone || 'medium')
  // Set random emoji on mount if none provided
  useEffect(() => {
    if (!initialValues.emoji) {
      const randomEmoji = defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)]
      setEmoji(randomEmoji)
    }
  }, [initialValues.emoji])

  const [title, setTitle] = useState(initialValues.title || '')
  const [description, setDescription] = useState(initialValues.description || '')
  const [startDate, setStartDate] = useState(initialValues.startDate || '')
  const [endDate, setEndDate] = useState(initialValues.endDate || '')
  const [wallpaper, setWallpaper] = useState(initialValues.wallpaper || '')
  const [wallpaperStyle, setWallpaperStyle] = useState<'cover' | 'contain' | 'auto'>('cover')
  const [wallpaperOpacity, setWallpaperOpacity] = useState(1)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [isWallpaperPickerOpen, setIsWallpaperPickerOpen] = useState(false)

  const isFormValid = title.trim().length > 0 && startDate.length > 0

  useEffect(() => {
    onValidationChange?.(isFormValid)
  }, [isFormValid, onValidationChange])
  const [wallpaperSearchQuery, setWallpaperSearchQuery] = useState('')
  const [wallpaperSearchResults, setWallpaperSearchResults] = useState<string[]>([])
  const [isWallpaperSearching, setIsWallpaperSearching] = useState(false)
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null)

  const changeWallpaper = (url: string) => {
    onWallpaperChange?.(url)
    setWallpaper(url)
  }

  // Set initial wallpaper on mount
  useEffect(() => {
    if (!wallpaper) {
      const placeholder = getRandomPlaceholder()
      setWallpaper(placeholder)
    }
  }, [])

  useEffect(() => {
    onEmojiPickerToggle?.(isEmojiPickerOpen)
  }, [isEmojiPickerOpen, onEmojiPickerToggle])

  useEffect(() => {
    onWallpaperPickerToggle?.(isWallpaperPickerOpen)
  }, [isWallpaperPickerOpen, onWallpaperPickerToggle])

  const handleWallpaperSearch = async (query: string) => {
    if (!query.trim()) {
      setWallpaperSearchResults([])
      return []
    }

    try {
      setIsWallpaperSearching(true)
      const urls = await searchWallpapers(query)
      setWallpaperSearchResults(urls)
      return urls
    } catch (error) {
      console.error('Failed to search wallpapers:', error)
      setWallpaperSearchResults([])
      return []
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

  const handleWikiSummary = async (query: string) => {
    // Only auto-fill if description is empty or very short
    if (!query.trim() || description.trim().length > 10) return
    
    // Clean query: remove common prefix "Trip to " or "My "
    const cleanedQuery = query.trim().replace(/^(Trip to|My|Our|Journey to)\s+/i, '')

    try {
      // Use local proxy to avoid CORS and Failed to fetch errors
      const response = await fetch(`/api/wiki?title=${encodeURIComponent(cleanedQuery)}`)
      if (response.ok) {
        const data = await response.json()
        const pages = data.query?.pages
        if (pages) {
          const pageId = Object.keys(pages)[0]
          if (pageId === '-1') return // Page not found
          
          const extract = pages[pageId]?.extract
          if (extract) {
            setDescription(extract.split('\n')[0].slice(0, 500)) // More generous slice
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch wiki summary:', error)
    }
  }

  const handleTitleBlur = () => {
    if (title.trim()) {
      // 1. Kick off wiki search (background)
      handleWikiSummary(title.trim())
      
      // 2. Kick off wallpaper search (background)
      handleWallpaperSearch(title.trim()).then(urls => {
        if (urls && urls.length > 0) {
          changeWallpaper(urls[0])
        }
      })
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setWallpaper(base64String)
      onWallpaperChange?.(base64String)
      setIsWallpaperPickerOpen(false)
    }
    reader.readAsDataURL(file)
  }

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


  return (
    <div className="space-y-6">
      {/* Emoji Picker Modal */}
      {isEmojiPickerOpen && (
        <ModalBackdrop onClick={() => setIsEmojiPickerOpen(false)}>
          <ModalContainer size="sm" className="rounded-[2rem]">
            <ModalHeader 
              title="Select Emoji" 
              onClose={() => setIsEmojiPickerOpen(false)}
              leading={
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <span className="text-xl">😊</span>
                </div>
              }
            />
            <ModalContent maxHeight={false}>
              <EmojiPicker 
                onSelect={(selected) => {
                  setEmoji(applySkinTone(selected, skinTone))
                  setIsEmojiPickerOpen(false)
                }}
                onClose={() => setIsEmojiPickerOpen(false)}
                selectedEmoji={emoji}
                selectedSkinTone={skinTone}
                onSkinToneChange={(tone) => {
                  setSkinTone(tone)
                  if (emoji) {
                    setEmoji(prev => applySkinTone(prev, tone)) 
                  }
                }}
              />
            </ModalContent>
          </ModalContainer>
        </ModalBackdrop>
      )}

      {/* Wallpaper Picker Modal */}
      {isWallpaperPickerOpen && (
        <ModalBackdrop onClick={() => setIsWallpaperPickerOpen(false)}>
          <ModalContainer size="lg">
            <ModalHeader 
              title="Background Media" 
              subtitle="Search photos or upload videos/photos"
              onClose={() => setIsWallpaperPickerOpen(false)}
              leading={
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg text-primary">landscape</span>
                </div>
              }
              actions={
                <label className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-primary text-[10px] font-bold cursor-pointer hover:bg-primary/20 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-xs">upload_file</span>
                  <span className="hidden sm:inline">Upload</span>
                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
              }
            />

            <div className="p-4 border-b border-white/5 flex flex-col gap-3 flex-shrink-0 bg-white/[0.02]">
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
                  placeholder="Search for wallpapers..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-white placeholder-neutral-500 focus:border-primary/50 outline-none text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleWallpaperSearch(wallpaperSearchQuery || 'travel')}
                  disabled={isWallpaperSearching}
                  className="absolute right-3 top-2.5 text-neutral-500 hover:text-white disabled:opacity-50"
                >
                  {isWallpaperSearching ? (
                    <span className="material-symbols-outlined animate-spin text-xs">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined text-xs">search</span>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type="url"
                  placeholder="Or paste direct image URL..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-neutral-500 focus:border-primary/50 outline-none text-[10px] transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val.startsWith('http')) {
                        changeWallpaper(val);
                        setIsWallpaperPickerOpen(false);
                      }
                    }
                  }}
                />
              </div>
            </div>

            <ModalContent>

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
                      changeWallpaper(url)
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
            </ModalContent>

            <ModalFooter>
              <div className="flex justify-between items-center w-full gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const styles = ['cover', 'contain', 'auto'] as const
                    const idx = styles.indexOf(wallpaperStyle as any)
                    setWallpaperStyle(styles[(idx + 1) % 3])
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 text-xs font-bold hover:text-white transition-all shadow-lg active:scale-90"
                >
                  Media Fit: {wallpaperStyle}
                </button>
                <button
                  onClick={() => setIsWallpaperPickerOpen(false)}
                  className="px-4 py-2 text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-bold"
                >
                  Done
                </button>
              </div>
            </ModalFooter>
          </ModalContainer>
        </ModalBackdrop>
      )}

      {/* Background */}
      {!hideBackground && (
        <ParallaxBackground 
          src={wallpaper || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop'} 
          opacity={wallpaperOpacity} 
          parallaxFactor={0.15}
        />
      )}

      {/* Form */}
      <form id="trip-edit-form" onSubmit={handleSubmit} className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Emoji */}
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(true)}
              className={`shrink-0 flex h-14 w-14 items-center justify-center rounded-xl text-3xl transition-all hover:scale-105 active:scale-95 ${
                emoji
                  ? 'bg-white/20 hover:bg-white/30'
                  : 'border-2 border-dashed border-white/30 bg-white/10 hover:bg-white/20'
              }`}
              title="Change emoji"
            >
              {emoji || '😊'}
            </button>

            {/* Trip name */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Trip name..."
              className="flex-1 min-w-0 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm text-white placeholder-white/50 focus:border-primary focus:outline-none transition-colors font-bold text-lg"
            />

            {/* Wallpaper */}
            <button
              type="button"
              onClick={handleWallpaperPickerOpen}
              title="Change wallpaper"
              className="shrink-0 flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-white/30 bg-white/10 text-white transition-all hover:scale-105 hover:bg-white/20 active:scale-95 overflow-hidden"
            >
              {wallpaper ? (
                <img src={wallpaper} alt="wallpaper" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-2xl">wallpaper</span>
              )}
            </button>
          </div>
        </div>

        <div className={compact ? "" : "mb-8 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8"}>
          {!compact && <h2 className="text-xl font-bold text-white mb-6">Trip Details</h2>}

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
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="When are you going?"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-2">End Date (Optional)</label>
                <DatePicker
                  value={endDate || ''}
                  onChange={setEndDate}
                  placeholder="When are you back?"
                />
              </div>
            </div>

            {!hideActions && (
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete
                  </button>
                )}

                <div className="flex-1 flex gap-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-3 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all active:scale-95 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className="flex-[2] py-3 px-6 rounded-2xl bg-primary text-slate-950 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 flex items-center justify-center gap-2 text-xs"
                  >
                    <span className="material-symbols-outlined text-sm">rocket_launch</span>
                    {isSubmitting ? 'Creating...' : submitButtonText}
                  </button>
                </div>
              </div>
            )}

            <ConfirmationModal
              isOpen={showDeleteConfirm}
              title="Delete Trip?"
              message={`Are you sure you want to delete "${title || 'this trip'}"? This action cannot be undone and all your plans will be lost.`}
              onConfirm={onDelete!}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
