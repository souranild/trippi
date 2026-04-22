'use client'

import { useState, useEffect } from 'react'
import { EMOJI_CATEGORIES, SKIN_TONES, applySkinTone, type SkinTone } from '@/lib/emoji-categories'

interface UserProfile {
  name: string
  skinTone: string
}

interface OnboardingScreenProps {
  onComplete: (profile: UserProfile) => void
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<'welcome' | 'name' | 'skin-tone' | 'complete'>('welcome')
  const [name, setName] = useState('')
  const [selectedSkinTone, setSelectedSkinTone] = useState('medium')
  const [previewEmoji, setPreviewEmoji] = useState('👋')

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      setStep('skin-tone')
    }
  }

  const handleSkinToneSelect = (code: string) => {
    setSelectedSkinTone(code)
  }

  const handleComplete = () => {
    const profile: UserProfile = {
      name: name.trim(),
      skinTone: selectedSkinTone,
    }
    
    // Save to localStorage
    localStorage.setItem('userProfile', JSON.stringify(profile))
    
    onComplete(profile)
  }

  useEffect(() => {
    // Update preview emoji when skin tone changes
    const baseEmoji = '👋'
    setPreviewEmoji(applySkinTone(baseEmoji, selectedSkinTone))
  }, [selectedSkinTone])

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-cyan-400 font-headline mb-2">
                Welcome to Trippi
              </h1>
              <p className="text-xl text-neutral-300">
                Let&apos;s set up your profile for the ultimate travel planning experience
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl">
              <div className="text-6xl mb-6">✈️</div>
              <h2 className="text-3xl font-bold text-white mb-4">Ready for adventure?</h2>
              <p className="text-neutral-300 mb-8">
                First, let&apos;s get to know you!<br />
                We&apos;ll ask for your name and help you customize your experience.
              </p>
              <button
                onClick={() => setStep('name')}
                className="w-full bg-gradient-to-r from-cyan-400 to-cyan-300 text-black font-bold py-4 px-6 rounded-xl hover:shadow-lg hover:shadow-cyan-400/50 transition-all duration-300 text-lg"
              >
                Let&apos;s Begin
              </button>
            </div>
          </div>
        )}

        {/* Name Step */}
        {step === 'name' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white font-headline mb-2">
                What&apos;s your name?
              </h2>
              <p className="text-neutral-400">
                We&apos;ll use this to personalize your travel stories
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl">
              <form onSubmit={handleNameSubmit} className="space-y-6">
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                    className="w-full rounded-xl border-2 border-white/20 bg-white/10 px-6 py-4 text-white placeholder-white/50 text-lg focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep('welcome')}
                    className="flex-1 rounded-xl border-2 border-white/20 text-white py-3 hover:bg-white/10 transition-colors font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim()}
                    className="flex-1 bg-gradient-to-r from-cyan-400 to-cyan-300 text-black font-bold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-cyan-400/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Skin Tone Step */}
        {step === 'skin-tone' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white font-headline mb-2">
                Choose your preferred emoji style
              </h2>
              <p className="text-neutral-400">
                Select a skin tone for your emoji representations
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl">
              <div className="mb-12">
                <p className="text-neutral-300 text-sm mb-4">Preview:</p>
                <div className="flex justify-center gap-4">
                  <div className="text-6xl">{previewEmoji}</div>
                  <div className="flex flex-col justify-center">
                    <p className="text-white font-bold text-lg">Waving Hand</p>
                    <p className="text-neutral-400">
                      {SKIN_TONES.find(st => st.code === selectedSkinTone)?.name} tone
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-white font-bold text-center">Skin Tone Options:</p>
                <div className="grid grid-cols-5 gap-3">
                  {SKIN_TONES.map((tone) => (
                    <button
                      key={tone.code}
                      onClick={() => handleSkinToneSelect(tone.code)}
                      className={`p-4 rounded-xl transition-all duration-200 border-2 ${
                        selectedSkinTone === tone.code
                          ? 'border-cyan-400 bg-cyan-400/20 shadow-lg shadow-cyan-400/50'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                      title={tone.name}
                    >
                      <div className="text-4xl text-center">
                        {applySkinTone('👋', tone.code)}
                      </div>
                      <p className="text-xs text-neutral-400 mt-2">{tone.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('name')}
                  className="flex-1 rounded-xl border-2 border-white/20 text-white py-3 hover:bg-white/10 transition-colors font-bold"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 bg-gradient-to-r from-cyan-400 to-cyan-300 text-black font-bold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-cyan-400/50 transition-all duration-300"
                >
                  Complete Setup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
