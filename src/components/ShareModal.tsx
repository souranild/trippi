'use client'

import { useState } from 'react'
import {
  ModalBackdrop,
  ModalContainer,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from '@/components/ModalLayout'
import { Button } from '@/components/Button'
import { Trip, Place } from '@/lib/storage'
import { formatDateShort } from '@/lib/date-utils'

interface ShareModalProps {
  trip: Trip
  places: Place[]
  onClose: () => void
}

export default function ShareModal({ trip, places, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const tripUrl = typeof window !== 'undefined' ? window.location.href : ''
  
  const generateTextSummary = () => {
    let text = `🌴 Trip: ${trip.emoji || ''} ${trip.title}\n`
    text += `📅 Dates: ${trip.startDate} ${trip.endDate ? `to ${trip.endDate}` : ''}\n\n`
    
    const sortedPlaces = [...places].sort((a, b) => (a.day || 0) - (b.day || 0))
    
    sortedPlaces.forEach((p) => {
      const daySuffix = (p.endDay && p.endDay > (p.day || 1)) ? `-${p.endDay}` : ''
      text += `📍 Day ${(p.day || 1)}${daySuffix}: ${p.name}\n`
      if (p.location) text += `   Location: ${p.location}\n`
      
      // Handle structured notes array
      if (Array.isArray(p.notes) && p.notes.length > 0) {
        const combinedNotes = p.notes
          .map(n => n.text)
          .filter(t => t && t.trim())
          .join('; ')
        if (combinedNotes) text += `   Notes: ${combinedNotes}\n`
      } else if (typeof p.notes === 'string' && p.notes.trim()) {
        text += `   Notes: ${p.notes}\n`
      }

      p.events?.forEach(e => {
        text += `   - [Event] ${e.title}${e.time ? ` (${e.time})` : ''}${e.location ? ` @ ${e.location}` : ''}\n`
      })
      
      p.accommodations?.forEach(a => {
        text += `   - [Hotel] ${a.name}${a.address ? ` (${a.address})` : ''}\n`
      })

      text += '\n'
    })
    
    text += `View full itinerary here: ${tripUrl}`
    return text
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(tripUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: string) => {
    const text = `Check out my trip itinerary for ${trip.title}!`
    const url = encodeURIComponent(tripUrl)
    const summary = encodeURIComponent(generateTextSummary())
    
    let shareUrl = ''
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${summary}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
        break
      case 'reddit':
        shareUrl = `https://www.reddit.com/submit?url=${url}&title=${encodeURIComponent(trip.title)}`
        break
      case 'text':
        navigator.clipboard.writeText(generateTextSummary())
        alert('Itinerary text copied to clipboard!')
        return
      case 'pdf':
        window.print()
        return
    }
    
    if (shareUrl) window.open(shareUrl, '_blank')
  }

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalContainer size="md" className="animate-in zoom-in-95 duration-300">
        <ModalHeader title="Share Itinerary" subtitle={trip.title} onClose={onClose} />
        
        <ModalContent className="p-6 space-y-8">
          {/* Primary Link Sharing */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-primary">Shareable Link</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-neutral-400 truncate select-all">
                {tripUrl}
              </div>
              <Button variant="primary" onClick={handleCopyLink} className="shrink-0 min-w-[100px]">
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          </div>

          {/* Social Platforms */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-neutral-500">Quick Share</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'whatsapp', label: 'WhatsApp', icon: (
                  <svg className="w-5 h-5 fill-[#25D366]" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                ) },
                { id: 'linkedin', label: 'LinkedIn', icon: (
                  <svg className="w-5 h-5 fill-[#0077B5]" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                ) },
                { id: 'reddit', label: 'Reddit', icon: (
                  <svg className="w-5 h-5 fill-[#FF4500]" viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.057 1.597.047.27.071.531.071.801 0 2.842-3.515 5.146-7.85 5.146-4.335 0-7.85-2.304-7.85-5.146 0-.27.024-.531.071-.801a1.74 1.74 0 0 1-1.057-1.597c0-.968.786-1.754 1.754-1.754.463 0 .875.18 1.183.472 1.201-.852 2.871-1.423 4.715-1.49l.858-4.025a.26.26 0 0 1 .312-.205l2.972.628c.03-.538.473-.964 1.018-.964zM8.274 12.056c-.724 0-1.31.585-1.31 1.31 0 .724.586 1.31 1.31 1.31.724 0 1.31-.586 1.31-1.31 0-.725-.586-1.31-1.31-1.31zm7.452 0c-.724 0-1.31.585-1.31 1.31 0 .724.586 1.31 1.31 1.31.724 0 1.31-.586 1.31-1.31 0-.725-.586-1.31-1.31-1.31zm-6.903 3.923c.121-.121.317-.121.438 0 .734.734 2.129.818 2.739.818.61 0 2.005-.084 2.739-.818a.31.31 0 0 1 .438 0 .31.31 0 0 1 0 .438c-.864.864-2.479.975-3.177.975s-2.313-.111-3.177-.975a.31.31 0 0 1 0-.438z"/></svg>
                ) },
                { id: 'text', label: 'Copy Text', icon: (
                  <span className="material-symbols-outlined text-2xl group-hover:text-primary transition-colors">content_copy</span>
                ) },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleShare(p.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                    {p.icon}
                  </div>
                  <span className="text-xs font-bold text-neutral-400 group-hover:text-white transition-colors">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Professional Export */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-neutral-500">Professional Export</p>
            <button
              onClick={() => handleShare('pdf')}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-neutral-800 to-neutral-900 border border-white/10 hover:border-primary/50 transition-all group active:scale-[0.99]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Save as PDF</p>
                  <p className="text-xs text-neutral-500 font-bold">Perfect for printing or sending via email</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-neutral-600 group-hover:text-primary transition-colors">download</span>
            </button>
          </div>
        </ModalContent>

        <ModalFooter>
          <Button variant="secondary" fullWidth onClick={onClose}>Done</Button>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>
  )
}
