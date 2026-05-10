'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Trip } from '@/lib/storage'

interface Particle {
  id: number
  emoji: string
  placeName: string
  baseX: number
  baseY: number
  duration: number
  delay: number
  waveAmplitude: number
  orbitRadius: number
}

// Pick N unique items from an array
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, shuffled.length))
}

export default function AnimatedParticleBackground({ trips }: { trips: Trip[] }) {
  const [allParticles, setAllParticles] = useState<Particle[]>([])
  const [visible, setVisible] = useState<Particle[]>([])

  // Build full pool from trips
  useEffect(() => {
    const pool: Particle[] = []
    let idx = 0

    trips.forEach((trip) => {
      const tripEmoji = trip.emoji || '📍'
      if (trip.places && trip.places.length > 0) {
        trip.places.forEach((place) => {
          pool.push({
            id: idx++,
            emoji: tripEmoji,
            placeName: place.name || 'Place',
            baseX: Math.random() * 80 + 10,
            baseY: Math.random() * 60 + 20,
            duration: 12 + Math.random() * 8,
            delay: 0,
            waveAmplitude: 30 + Math.random() * 60,
            orbitRadius: 20 + Math.random() * 40,
          })
        })
      } else {
        // Trip with no places - still show the trip emoji
        pool.push({
          id: idx++,
          emoji: tripEmoji,
          placeName: trip.title,
          baseX: Math.random() * 80 + 10,
          baseY: Math.random() * 60 + 20,
          duration: 15 + Math.random() * 10,
          delay: 0,
          waveAmplitude: 40 + Math.random() * 40,
          orbitRadius: 30 + Math.random() * 30,
        })
      }
    })

    // Always add some default particles to ensure the scene isn't too sparse
    const defaults = ['✈️', '🏖️', '🏔️', '🌍', '🗼', '🍕', '📸', '🚆']
    const names = ['Journey', 'Adventure', 'Escape', 'Explore', 'Wander', 'Taste', 'Moment', 'Route']
    const countToAdd = Math.max(3, 8 - pool.length)
    
    for (let i = 0; i < countToAdd; i++) {
      const dIdx = i % defaults.length
      pool.push({
        id: idx++,
        emoji: defaults[dIdx],
        placeName: names[dIdx],
        baseX: Math.random() * 70 + 15,
        baseY: Math.random() * 50 + 25,
        duration: 10 + Math.random() * 15,
        delay: 0,
        waveAmplitude: 40 + Math.random() * 50,
        orbitRadius: 30 + Math.random() * 50,
      })
    }

    setAllParticles(pool)
  }, [trips])

  useEffect(() => {
    if (allParticles.length === 0) return
    // Show a selection of up to 8 particles permanently
    setVisible(pickRandom(allParticles, 8))
  }, [allParticles])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">
      {/* Base Dark Layer */}
      <div className="absolute inset-0 bg-[#0a0a0b]" />

      {/* Modern Fluid Mesh Gradient Blobs */}
      <div className="absolute inset-0 opacity-50 mix-blend-screen">
        {/* Blob 1: Aquatic Cyan */}
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[130px] animate-fluid-move-1" />
        {/* Blob 2: Deep Sea Blue */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[110px] animate-fluid-move-2" />
        {/* Blob 3: Tropical Emerald */}
        <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px] animate-fluid-move-3" />
        {/* Blob 4: Midnight Blue */}
        <div className="absolute bottom-[10%] left-[20%] w-[55%] h-[55%] rounded-full bg-primary/15 blur-[120px] animate-fluid-move-4" />
      </div>

      {/* Surface Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Up to 3 floating particles */}
      {visible.map((particle) => (
        <div
          key={particle.id}
          style={{
            position: 'absolute',
            left: `${particle.baseX}%`,
            top: `${particle.baseY}%`,
            transform: 'translate(-50%, -50%)',
            animation: `floatBob${particle.id} ${particle.duration}s ease-in-out infinite`,
          }}
        >
          <div
            className="rounded-full p-4 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center gap-1 min-w-[90px] w-auto shadow-2xl bg-white/5 opacity-50 transition-all duration-1000"
          >
            <span className="text-3xl select-none filter drop-shadow-lg">{particle.emoji}</span>
            <div className="max-w-[80px] overflow-hidden relative">
              <span className={`inline-block text-[10px] font-bold uppercase tracking-widest text-white/40 text-center leading-tight px-1 whitespace-nowrap ${particle.placeName.length > 10 ? 'animate-floatie-scroll' : ''}`}>
                {particle.placeName}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Keyframes and Animations */}
      <style>
        {`
          @keyframes floatie-scroll {
            0%, 20% { transform: translateX(0); }
            45%, 55% { transform: translateX(calc(-100% + 72px)); }
            80%, 100% { transform: translateX(0); }
          }
          .animate-floatie-scroll { 
            animation: floatie-scroll 6s linear infinite; 
          }
          @keyframes fluid-move-1 {
            0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
            33% { transform: translate(10%, 15%) rotate(5deg) scale(1.1); }
            66% { transform: translate(-5%, 10%) rotate(-5deg) scale(0.9); }
          }
          @keyframes fluid-move-2 {
            0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1.1); }
            33% { transform: translate(-15%, -10%) rotate(-8deg) scale(1); }
            66% { transform: translate(10%, -5%) rotate(8deg) scale(1.2); }
          }
          @keyframes fluid-move-3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-20%, 20%) scale(1.2); }
          }
          @keyframes fluid-move-4 {
            0%, 100% { transform: translate(0, 0) scale(1.1); }
            50% { transform: translate(15%, -15%) scale(0.9); }
          }

          .animate-fluid-move-1 { animation: fluid-move-1 25s ease-in-out infinite; }
          .animate-fluid-move-2 { animation: fluid-move-2 30s ease-in-out infinite; }
          .animate-fluid-move-3 { animation: fluid-move-3 22s ease-in-out infinite; }
          .animate-fluid-move-4 { animation: fluid-move-4 28s ease-in-out infinite; }

          ${visible.map((p) => `
            @keyframes floatBob${p.id} {
              0%   { transform: translate(-50%, -50%) translateY(0px) translateX(0px) scale(0.95) rotate(0deg); }
              25%  { transform: translate(-50%, -50%) translateY(-${p.waveAmplitude * 0.5}px) translateX(${p.orbitRadius}px) scale(1) rotate(5deg); }
              50%  { transform: translate(-50%, -50%) translateY(${p.waveAmplitude * 0.4}px) translateX(0px) scale(0.97) rotate(0deg); }
              75%  { transform: translate(-50%, -50%) translateY(-${p.waveAmplitude * 0.3}px) translateX(-${p.orbitRadius}px) scale(1) rotate(-5deg); }
              100% { transform: translate(-50%, -50%) translateY(0px) translateX(0px) scale(0.95) rotate(0deg); }
            }
          `).join('')}
        `}
      </style>
    </div>
  )
}

