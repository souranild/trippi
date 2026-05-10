'use client'

import { useState, useEffect, useRef } from 'react'
import { searchWallpapers, getRandomPlaceholder, getDiscoveryWallpapers } from '@/lib/wallpaper-search'
import { applySkinTone } from '@/lib/emoji-categories'
import { Place } from '@/lib/storage'
import ParallaxBackground from './ParallaxBackground'

import { useTrips } from '@/context/TripContext'
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '@/components/ModalLayout'
import { FormLabel, FormTextarea, FormInput } from '@/components/FormLayout'
import EmojiPicker from './EmojiPicker'
import DatePicker from './DatePicker'
import { ConfirmationModal } from './ConfirmationModal'
import { generateAiPrompt, parseItineraryJson } from '@/lib/ai-itinerary'
import { Button } from './Button'

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
    places?: Place[]
    tags?: string[]
  }
  onSubmit: (data: {
    emoji: string
    title: string
    description: string
    startDate: string
    endDate: string
    wallpaper: string
    places?: Place[]
    tags?: string[]
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
  const [hasEditedDescription, setHasEditedDescription] = useState(false)
  const [isAutoFilled, setIsAutoFilled] = useState(false)
  const [startDate, setStartDate] = useState(initialValues.startDate || '')
  const [endDate, setEndDate] = useState(initialValues.endDate || '')
  const [wallpaper, setWallpaper] = useState(initialValues.wallpaper || '')
  const [tags, setTags] = useState<string[]>(initialValues.tags || [])
  const [newTag, setNewTag] = useState('')
  const [wallpaperStyle, setWallpaperStyle] = useState<'cover' | 'contain' | 'auto'>('cover')
  const [wallpaperOpacity, setWallpaperOpacity] = useState(1)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [isWallpaperPickerOpen, setIsWallpaperPickerOpen] = useState(false)
  const [isPromptCopied, setIsPromptCopied] = useState(false)

  const isFormValid = title.trim().length > 0 && startDate.length > 0

  useEffect(() => {
    onValidationChange?.(isFormValid)
  }, [isFormValid, onValidationChange])
  const [wallpaperSearchQuery, setWallpaperSearchQuery] = useState('')
  const [wallpaperSearchResults, setWallpaperSearchResults] = useState<string[]>([])
  const [discoveryWallpapers, setDiscoveryWallpapers] = useState<string[]>([])
  const [isWallpaperSearching, setIsWallpaperSearching] = useState(false)
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null)

  const changeWallpaper = (url: string) => {
    onWallpaperChange?.(url)
    setWallpaper(url)
  }

  // Set initial wallpaper on mount
  useEffect(() => {
    async function loadDiscovery() {
      const urls = await getDiscoveryWallpapers()
      setDiscoveryWallpapers(urls)
      if (!wallpaper && urls.length > 0) {
        const randomWallpaper = urls[Math.floor(Math.random() * urls.length)]
        changeWallpaper(randomWallpaper)
      } else if (!wallpaper) {
        const placeholder = getRandomPlaceholder()
        changeWallpaper(placeholder)
      }
    }
    loadDiscovery()
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

  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')

  const handleCopyPrompt = () => {
    // Include existing places and tags to make the prompt context-aware
    const promptText = generateAiPrompt(title || 'My Adventure', startDate || 'TBD', endDate || 'TBD', importedPlaces, tags)
    navigator.clipboard.writeText(promptText)
  }

  const handleImportJson = async () => {
    if (!importJsonText.trim()) return

    try {
      const parsed = await parseItineraryJson(importJsonText)
      if (parsed) {
        if (parsed.title) setTitle(parsed.title)
        if (parsed.description) setDescription(parsed.description)
        if (parsed.startDate) setStartDate(parsed.startDate)
        if (parsed.endDate) setEndDate(parsed.endDate)
        if (parsed.emoji) setEmoji(parsed.emoji)
        if (parsed.tags) setTags(parsed.tags)
        
        if (parsed.places) {
          setImportedPlaces(parsed.places as Place[])
        }
        setIsImportModalOpen(false)
        setImportJsonText('')
        alert('Itinerary imported successfully!')
      } else {
        alert('Invalid JSON format. Please make sure you copied the entire JSON block from the AI.')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to import itinerary. Please check the JSON format.')
    }
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
            setIsAutoFilled(true)
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

  const handleWallpaperPickerOpen = () => {
    setIsWallpaperPickerOpen(true)
    const searchQuery = title.trim() || 'travel'
    setWallpaperSearchQuery(searchQuery)
    setWallpaperSearchResults([])
    setTimeout(() => {
      handleWallpaperSearch(searchQuery)
    }, 0)
  }

  const [importedPlaces, setImportedPlaces] = useState<Place[]>(initialValues?.places || [])
  
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !emoji || !startDate) return

    onSubmit({
      emoji,
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      wallpaper,
      places: importedPlaces,
      tags
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

      {/* JSON Import Modal */}
      {isImportModalOpen && (
        <ModalBackdrop onClick={() => setIsImportModalOpen(false)}>
          <ModalContainer size="md">
            <ModalHeader 
              title="Import Itinerary" 
              subtitle="Paste the AI-generated JSON below"
              onClose={() => setIsImportModalOpen(false)}
              leading={
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg text-emerald-400">data_object</span>
                </div>
              }
            />
            <ModalContent>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
                  <span className="material-symbols-outlined text-blue-400">info</span>
                  <p className="text-[10px] font-medium text-blue-200/70 leading-relaxed">
                    Paste the raw JSON response you received from the AI. Trippi will automatically extract the places, transport legs, and events to populate your itinerary.
                  </p>
                </div>
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"places": [...]}'
                  className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-mono text-emerald-400 placeholder-emerald-900/50 focus:border-emerald-500/50 focus:outline-none transition-all resize-none"
                />
              </div>
            </ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
              <Button 
                variant="modal-primary" 
                icon="download"
                onClick={handleImportJson}
                disabled={!importJsonText.trim()}
              >
                Import Data
              </Button>
            </ModalFooter>
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
      <form id="trip-edit-form" onSubmit={handleFinalSubmit} className="relative z-10 mx-auto max-w-4xl space-y-6">
        {/* Header Section: Emoji + Title + Wallpaper */}
        <div className="flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-xl group transition-all hover:bg-white/[0.08]">
          {/* Emoji */}
          <button
            type="button"
            onClick={() => setIsEmojiPickerOpen(true)}
            className={`shrink-0 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-all hover:scale-105 active:scale-95 shadow-lg ${
              emoji
                ? 'bg-white/10 hover:bg-white/20 border border-white/10'
                : 'border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10'
            }`}
            title="Change emoji"
          >
            {emoji || '😊'}
          </button>

          {/* Trip name */}
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1.5 opacity-70">Adventure Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Where are we going?"
              className="w-full bg-transparent text-2xl font-black text-white placeholder-white/20 focus:outline-none transition-colors font-headline"
            />
          </div>

          {/* Wallpaper */}
          <button
            type="button"
            onClick={handleWallpaperPickerOpen}
            title="Change wallpaper"
            className="shrink-0 flex h-16 w-24 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95 overflow-hidden shadow-lg group/wallpaper"
          >
            {wallpaper ? (
              <div className="relative w-full h-full">
                <img src={wallpaper} alt="wallpaper" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/wallpaper:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-base">edit</span>
                </div>
              </div>
            ) : (
              <span className="material-symbols-outlined text-2xl opacity-30">wallpaper</span>
            )}
          </button>
        </div>

        <div className={`space-y-8 ${compact ? '' : 'mt-8 p-6 md:p-8 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl'}`}>
          {!compact && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-primary">description</span>
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Adventure Details</h3>
            </div>
          )}

          <div className="space-y-6">
            <div className="relative">
              <FormTextarea
                label={
                  <div className="flex items-center gap-2">
                    Description
                    {isAutoFilled && !hasEditedDescription && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[8px] font-black text-blue-400 uppercase animate-pulse">
                        <span className="material-symbols-outlined text-[10px]">auto_fix</span>
                        Edit to personalize
                      </span>
                    )}
                  </div>
                }
                labelVariant="default"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setHasEditedDescription(true)
                }}
                placeholder="Tell us about your trip..."
                className="!h-32"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <FormLabel>Start Date</FormLabel>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="When are you going?"
                />
              </div>
              <div className="space-y-2">
                <FormLabel>End Date (Optional)</FormLabel>
                <DatePicker
                  value={endDate || ''}
                  onChange={setEndDate}
                  placeholder="When are you back?"
                />
              </div>
            </div>
            <div className="space-y-4">
              <FormLabel>Adventure Tags</FormLabel>
              <div className="flex flex-wrap gap-2">
                {['Chill', 'Adventurous', 'Forest', 'City Break', 'Beach', 'Cultural', 'Luxury', 'Budget'].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      if (tags.includes(style)) {
                        setTags(tags.filter(t => t !== style))
                      } else {
                        setTags([...tags, style])
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                      tags.includes(style)
                        ? 'bg-primary border-primary text-slate-950 shadow-lg shadow-primary/20'
                        : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/30'
                    }`}
                  >
                    {style}
                  </button>
                ))}
                
                {/* Custom User Tags */}
                {tags.filter(t => !['Chill', 'Adventurous', 'Forest', 'City Break', 'Beach', 'Cultural', 'Luxury', 'Budget'].includes(t)).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags(tags.filter(t => t !== tag))}
                    className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border bg-primary/20 border-primary/50 text-primary shadow-lg shadow-primary/10 flex items-center gap-2 group/tag"
                  >
                    {tag}
                    <span className="material-symbols-outlined text-xs opacity-50 group-hover/tag:opacity-100">close</span>
                  </button>
                ))}
              </div>

              <div className="relative max-w-xs">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = newTag.trim()
                      if (val && !tags.includes(val)) {
                        setTags([...tags, val])
                        setNewTag('')
                      }
                    }
                  }}
                  placeholder="Add custom tag..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = newTag.trim()
                    if (val && !tags.includes(val)) {
                      setTags([...tags, val])
                      setNewTag('')
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all"
                >
                  <span className="material-symbols-outlined text-xs">add</span>
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">AI Planning Tools</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
              </div>
              
              <div className="space-y-4">
                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl text-primary">auto_awesome</span>
                  </div>
                  
                  <div className="relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                      {/* Connecting Line (Desktop) */}
                      <div className="hidden md:block absolute top-6 left-[15%] right-[15%] h-px border-t border-dashed border-white/10 z-0" />
                      
                      {[
                        { step: '01', icon: 'content_copy', title: 'Copy Prompt', desc: 'Tailored prompt with your vibe' },
                        { step: '02', icon: 'chat', title: 'Ask AI', desc: 'Get JSON from ChatGPT/Gemini' },
                        { step: '03', icon: 'input', title: 'Import', desc: 'Build your trip in one click' }
                      ].map((s, i) => (
                        <div key={i} className="relative z-10 flex flex-col items-center text-center">
                          <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center mb-2 shadow-xl group-hover:border-primary/30 transition-all">
                            <span className="material-symbols-outlined text-base text-neutral-400 group-hover:text-primary">{s.icon}</span>
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-[7px] font-black flex items-center justify-center text-black shadow-lg ring-2 ring-neutral-950">
                              {s.step}
                            </div>
                          </div>
                          <p className="text-[9px] font-black text-white uppercase tracking-widest mb-0.5">{s.title}</p>
                          <p className="text-[8px] text-neutral-500 font-medium leading-relaxed max-w-[100px]">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyPrompt();
                        setIsPromptCopied(true);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-2xl transition-all group relative overflow-hidden ${
                        isPromptCopied 
                          ? 'bg-primary/20 border border-primary/40' 
                          : 'bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 ${
                        isPromptCopied ? 'bg-primary/20 text-primary' : 'bg-indigo-500/20 text-indigo-400'
                      }`}>
                        <span className="material-symbols-outlined text-xl">
                          {isPromptCopied ? 'check_circle' : 'auto_fix'}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-white uppercase tracking-widest">
                          {isPromptCopied ? 'Prompt Copied!' : 'Copy AI Prompt'}
                        </p>
                        <p className={`text-[10px] font-medium ${isPromptCopied ? 'text-primary/70' : 'text-indigo-300/60'}`}>
                          {isPromptCopied ? 'Ready to paste in AI' : 'Generate itinerary with AI'}
                        </p>
                      </div>
                      
                      {isPromptCopied && (
                        <div className="absolute inset-0 bg-primary/5 pointer-events-none animate-pulse" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-xl">file_download</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-white uppercase tracking-widest">Import JSON</p>
                        <p className="text-[10px] text-emerald-300/60 font-medium">Paste AI output or external data</p>
                      </div>
                    </button>
                  </div>

                  {isPromptCopied && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.2em]">Open AI Assistant</p>
                        <button 
                          onClick={() => setIsPromptCopied(false)}
                          className="text-[9px] font-bold text-neutral-600 hover:text-white transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Gemini', url: 'https://gemini.google.com', color: 'text-blue-400', bg: 'bg-blue-400/10' },
                          { name: 'ChatGPT', url: 'https://chatgpt.com', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                          { name: 'Claude', url: 'https://claude.ai', color: 'text-orange-400', bg: 'bg-orange-400/10' },
                          { name: 'Grok', url: 'https://x.com/i/grok', color: 'text-white', bg: 'bg-white/10' },
                          { name: 'Perplexity', url: 'https://www.perplexity.ai', color: 'text-cyan-400', bg: 'bg-cyan-400/10' }
                        ].map((ai) => (
                          <a
                            key={ai.name}
                            href={ai.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl ${ai.bg} border border-white/5 hover:border-white/20 transition-all active:scale-95 group/ai`}
                          >
                            <span className={`text-[10px] font-black uppercase tracking-widest ${ai.color}`}>{ai.name}</span>
                            <span className="material-symbols-outlined text-[10px] text-neutral-600 group-hover/ai:text-white transition-colors">open_in_new</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!hideActions && (
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/5">
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete
                  </button>
                )}

                <div className="flex-1 flex gap-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-3 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all active:scale-95 text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className="flex-[2] py-3 px-6 rounded-2xl bg-primary text-slate-950 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
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
