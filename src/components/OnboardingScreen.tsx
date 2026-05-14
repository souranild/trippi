'use client'

import { useState, useEffect, useMemo } from 'react'
import { EMOJI_CATEGORIES, SKIN_TONES, applySkinTone, supportsSkinTone, type SkinTone } from '@/lib/emoji-categories'
import { generateFunnyName } from '@/lib/funny-names'
import EmojiAvatar from '@/components/EmojiAvatar'
import EmojiPicker from '@/components/EmojiPicker'
import { useTrips } from '@/context/TripContext'
import { useAuth } from '@/hooks/useAuth'

interface UserProfile {
  name: string
  skinTone: string
  avatar: string
  email?: string
  isGoogleAuth?: boolean
}

interface OnboardingScreenProps {
  onComplete: (profile: UserProfile) => void
  initialProfile?: UserProfile | null
  onCancel?: () => void
}

export default function OnboardingScreen({ onComplete, initialProfile, onCancel }: OnboardingScreenProps) {
  const { trips } = useTrips()
  const [step, setStep] = useState<'welcome' | 'profile' | 'complete'>(initialProfile ? 'profile' : 'welcome')
  const [showEditor, setShowEditor] = useState(!initialProfile) // Start with stats if already has a profile
  const [name, setName] = useState(initialProfile?.name || '')
  const [selectedSkinTone, setSelectedSkinTone] = useState(initialProfile?.skinTone || 'medium')
  const [selectedAvatar, setSelectedAvatar] = useState(initialProfile?.avatar || '✈️')
  const [isGoogleAuth, setIsGoogleAuth] = useState(initialProfile?.isGoogleAuth || false)
  const [email, setEmail] = useState(initialProfile?.email || '')
  const { signInWithGoogle, logout } = useAuth()
  const isEditing = !!initialProfile

  const stats = useMemo(() => {
    const allPlaces = trips.flatMap(t => t.places || [])
    const uniqueCountries = new Set(allPlaces.map(p => p.country).filter(Boolean)).size
    return {
      trips: trips.length,
      countries: uniqueCountries,
      places: allPlaces.length
    }
  }, [trips])

  const generateName = () => {
    setName(generateFunnyName())
  }

  // Generate a random name on first mount if empty
  useEffect(() => {
    if (!name && !isEditing) {
      generateName()
    }
  }, [])

  const handleComplete = () => {
    const profile: UserProfile = {
      name: name.trim() || 'Anonymous Explorer',
      skinTone: selectedSkinTone,
      avatar: selectedAvatar,
      email: email,
      isGoogleAuth: isGoogleAuth
    }
    
    // Save to localStorage
    localStorage.setItem('userProfile', JSON.stringify(profile))
    onComplete(profile)
  }

  return (
    <div className="fixed inset-0 z-[4000] bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-4xl w-full">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mb-12">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-2xl shadow-cyan-500/20 mb-6 active:scale-95 transition-transform duration-300">
                <span className="material-symbols-outlined text-5xl text-slate-950">flight_takeoff</span>
              </div>
              <h1 className="text-5xl sm:text-7xl font-bold text-white font-headline mb-4 tracking-tight leading-tight">
                Adventure awaits <br /> on <span className="text-cyan-400">Trippi</span>
              </h1>
              <p className="text-xl text-neutral-400 max-w-xl mx-auto leading-relaxed">
                Your personal gateway to the world's most incredible journeys. Let's start by creating your identity.
              </p>
            </div>

            <button
              onClick={() => setStep('profile')}
              className="group relative inline-flex items-center justify-center px-12 py-5 font-bold text-slate-950 transition-all duration-300 bg-cyan-400 rounded-2xl hover:bg-cyan-300 hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative text-lg">Start Exploring</span>
            </button>
          </div>
        )}

        {/* Profile Creation Step */}
        {step === 'profile' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden max-w-2xl mx-auto">
              {!showEditor ? (
                /* Stats View */
                <div className="p-8 sm:p-12 space-y-10">
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-[40px] group-hover:bg-primary/30 transition-all duration-500" />
                      <EmojiAvatar 
                        emoji={selectedAvatar} 
                        skinTone={selectedSkinTone} 
                        size="xl" 
                        className="relative ring-4 ring-white/10 shadow-2xl"
                      />
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold text-white tracking-tight">{name}</h2>
                      <p className="text-primary font-bold uppercase tracking-[0.3em] text-[10px] mt-2">World Traveler</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center group hover:bg-white/10 transition-all cursor-default">
                      <p className="text-heading-3 font-bold text-white mb-1 group-hover:scale-110 transition-transform">{stats.trips}</p>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Trips</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center group hover:bg-white/10 transition-all cursor-default">
                      <p className="text-heading-3 font-bold text-white mb-1 group-hover:scale-110 transition-transform">{stats.countries}</p>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Countries</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center group hover:bg-white/10 transition-all cursor-default">
                      <p className="text-heading-3 font-bold text-white mb-1 group-hover:scale-110 transition-transform">{stats.places}</p>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Places</p>
                    </div>
                  </div>

                  {!isGoogleAuth && (
                    <button
                      onClick={async () => {
                        try {
                          const user = await signInWithGoogle()
                          if (user) {
                            const googleName = user.displayName || name
                            const googleAvatar = user.photoURL || selectedAvatar
                            const googleEmail = user.email || ''
                            
                            setName(googleName)
                            setSelectedAvatar(googleAvatar)
                            setEmail(googleEmail)
                            setIsGoogleAuth(true)
                            
                            // Auto-save immediately so it persists
                            const profile: UserProfile = {
                              name: googleName,
                              skinTone: selectedSkinTone,
                              avatar: googleAvatar,
                              email: googleEmail,
                              isGoogleAuth: true
                            }
                            localStorage.setItem('userProfile', JSON.stringify(profile))
                            onComplete(profile)
                          }
                        } catch (error: any) {
                          console.error('Login failed', error)
                          alert(error.message || 'Login failed. Please check your Firebase configuration.')
                        }
                      }}
                      className="w-full py-3 px-6 rounded-2xl bg-white/5 border border-white/10 text-neutral-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-[10px]"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                      Sign in with Google to import profile
                    </button>
                  )}

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setShowEditor(true)}
                      className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Edit Profile
                    </button>
                    <button
                      onClick={onCancel}
                      className="flex-1 py-4 px-6 rounded-2xl bg-primary text-slate-950 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit Profile View */
                <div className="grid grid-cols-1 md:grid-cols-12">
                  <div className="md:col-span-4 p-8 sm:p-10 bg-white/5 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-white/10">
                    <div className="relative group mb-6">
                      <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl group-hover:bg-cyan-500/30 transition-all duration-500" />
                      <EmojiAvatar 
                        emoji={selectedAvatar} 
                        skinTone={selectedSkinTone} 
                        size="xl" 
                        className="relative ring-4 ring-white/10"
                      />
                    </div>
                    
                    <div className="w-full space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your traveler name"
                          className="w-full bg-transparent border-b-2 border-primary/30 focus:border-cyan-400 px-1 py-2 text-center text-xl font-bold text-white focus:outline-none transition-all placeholder:text-neutral-600"
                          maxLength={25}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={generateName}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-cyan-400 transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          <span className="material-symbols-outlined text-sm">refresh</span>
                          Surprise Me
                        </button>
                        
                        <button
                          onClick={async () => {
                            try {
                              const user = await signInWithGoogle()
                              if (user) {
                                const googleName = user.displayName || name
                                const googleAvatar = user.photoURL || selectedAvatar
                                const googleEmail = user.email || ''
                                
                                setName(googleName)
                                setSelectedAvatar(googleAvatar)
                                setEmail(googleEmail)
                                setIsGoogleAuth(true)
                                
                                // Auto-save immediately so it persists
                                const profile: UserProfile = {
                                  name: googleName,
                                  skinTone: selectedSkinTone,
                                  avatar: googleAvatar,
                                  email: googleEmail,
                                  isGoogleAuth: true
                                }
                                localStorage.setItem('userProfile', JSON.stringify(profile))
                                onComplete(profile)
                              }
                            } catch (error: any) {
                              console.error('Login failed', error)
                              alert(error.message || 'Login failed. Please check your Firebase configuration.')
                            }
                          }}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-cyan-400 transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                          Sign in with Google
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 flex flex-col h-[500px] sm:h-[600px]">
                    <EmojiPicker 
                      onSelect={setSelectedAvatar}
                      onClose={() => {}} 
                      selectedEmoji={selectedAvatar}
                      selectedSkinTone={selectedSkinTone}
                      onSkinToneChange={setSelectedSkinTone}
                    />

                    <div className="p-6 sm:p-8 bg-slate-900 border-t border-white/5 flex flex-col gap-4">
                      {isGoogleAuth && (
                        <button
                          onClick={async () => {
                            try {
                              await logout();
                              setIsGoogleAuth(false);
                              setEmail('');
                              // We don't necessarily reset name/avatar unless they want to
                            } catch (error) {
                              console.error('Logout failed', error);
                            }
                          }}
                          className="w-full py-2 px-4 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">logout</span>
                          Disconnect Google Account
                        </button>
                      )}
                      <div className="flex gap-4">
                        <button
                          onClick={isEditing ? () => setShowEditor(false) : onCancel}
                          className="flex-1 py-4 px-6 rounded-2xl border-2 border-white/10 text-white font-bold hover:bg-white/5 transition-all active:scale-95"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleComplete}
                          className="flex-[2] py-4 px-6 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all active:scale-95"
                        >
                          {isEditing ? 'Save Changes' : 'All Set, Let\'s Go!'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
