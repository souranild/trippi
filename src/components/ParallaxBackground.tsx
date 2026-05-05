'use client'

import { useEffect, useRef, useState } from 'react'

interface ParallaxBackgroundProps {
  src: string
  opacity?: number
  overlayColor?: string
  blur?: string
  parallaxFactor?: number // 0.1 to 0.5 recommended
  containerRef?: React.RefObject<HTMLElement | null>
  topVignette?: boolean | number // true/false or opacity value (0-1)
}

export default function ParallaxBackground({ 
  src, 
  opacity = 1, 
  overlayColor = 'rgba(0,0,0,0.4)', 
  blur = '2px',
  parallaxFactor = 0.2,
  containerRef,
  topVignette = true
}: ParallaxBackgroundProps) {
  const [displaySrc, setDisplaySrc] = useState(src)
  const [prevSrc, setPrevSrc] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const bgRef = useRef<HTMLDivElement>(null)
  const prevBgRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const targetScrollY = useRef(0)
  const currentScrollY = useRef(0)

  // Handle src change with cross-fade
  useEffect(() => {
    if (src !== displaySrc) {
      setPrevSrc(displaySrc)
      setDisplaySrc(src)
      setIsTransitioning(true)
      
      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setPrevSrc(null)
      }, 1000) // Match transition duration
      
      return () => clearTimeout(timer)
    }
  }, [src, displaySrc])

  // If a containerRef is given, the parallax is absolute inside that container.
  // Otherwise it must be fixed (page-level scroll via window).
  const isContained = !!containerRef

  // Keep generous overscan so long pages never reveal empty background at max scroll.
  const overscanMultiplier = Math.min(3, Math.max(2.2, 1 + parallaxFactor * 8))
  const overscanHeight = `${overscanMultiplier * 100}%`
  const overscanTop = `-${((overscanMultiplier - 1) * 50).toFixed(1)}%`

  useEffect(() => {
    const el = bgRef.current
    const prevEl = prevBgRef.current
    if (!el) return

    const animate = () => {
      // Lerp the scroll position (0.08 is the smoothing factor, lower = smoother)
      currentScrollY.current += (targetScrollY.current - currentScrollY.current) * 0.08
      
      // Use translate3d for GPU acceleration and extra smoothness
      const transform = `translate3d(0, ${-currentScrollY.current * parallaxFactor}px, 0)`
      el.style.transform = transform
      if (prevEl) prevEl.style.transform = transform
      
      rafRef.current = requestAnimationFrame(animate)
    }

    const onScroll = () => {
      targetScrollY.current = containerRef?.current
        ? containerRef.current.scrollTop
        : window.scrollY
    }

    // Initialize positions
    const initialScroll = containerRef?.current ? containerRef.current.scrollTop : window.scrollY
    targetScrollY.current = initialScroll
    currentScrollY.current = initialScroll

    // Start animation loop
    rafRef.current = requestAnimationFrame(animate)

    const targetSource = containerRef?.current ?? window
    targetSource.addEventListener('scroll', onScroll, { passive: true })
    
    return () => {
      targetSource.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [containerRef, parallaxFactor, isTransitioning])

  return (
    // fixed when page-level scroll, absolute when inside a scrolling container
    <div className={`${isContained ? 'absolute' : 'fixed'} inset-0 z-0 overflow-hidden pointer-events-none bg-neutral-950`}>
      {/* Previous Background Layer (Fading Out) */}
      {prevSrc && (
        <div
          ref={prevBgRef}
          className="absolute inset-x-0 bg-cover bg-center bg-no-repeat will-change-transform"
          style={{
            backgroundImage: `url(${prevSrc})`,
            opacity: isTransitioning ? 0 : opacity,
            top: overscanTop,
            height: overscanHeight,
            transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}

      {/* Current Background Layer (Fading In) */}
      <div
        ref={bgRef}
        className="absolute inset-x-0 bg-cover bg-center bg-no-repeat will-change-transform"
        style={{
          backgroundImage: (displaySrc.startsWith('data:video') || displaySrc.includes('video') || displaySrc.match(/\.(mp4|webm|ogg)$/i)) ? 'none' : `url(${displaySrc})`,
          opacity: isTransitioning ? opacity : opacity,
          top: overscanTop,
          height: overscanHeight,
          transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {(displaySrc.startsWith('data:video') || displaySrc.includes('video') || displaySrc.match(/\.(mp4|webm|ogg)$/i)) && (
          <video 
            src={displaySrc} 
            autoPlay 
            muted 
            loop 
            playsInline 
            className="w-full h-full object-cover"
          />
        )}
      </div>
      
      {/* Vignette Overlay (Top-down shadow for UI visibility) */}
      {topVignette !== false && (
        <div 
          className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-transparent pointer-events-none" 
          style={{ opacity: typeof topVignette === 'number' ? topVignette : 0.4 }}
        />
      )}

      <div 
        className="absolute inset-0" 
        style={{ 
          backgroundColor: overlayColor,
          backdropFilter: `blur(${blur})`,
          transition: 'backdrop-filter 0.5s ease',
        }} 
      />
    </div>
  )
}
