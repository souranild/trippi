'use client'

import Link from 'next/link'

export default function EmptyState() {
  return (
    <div className="relative w-full">
      {/* Call to Action Section */}
      <div className="min-h-80 sm:min-h-96 flex flex-col items-center justify-center py-8 sm:py-12 relative overflow-hidden">
        {/* Background glow for emphasis */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-3xl rounded-full animate-pulse pointer-events-none"></div>

        {/* Illustration placeholder */}
        <div className="mb-6 sm:mb-8 text-5xl sm:text-6xl animate-bounce">✈️</div>

        {/* Heading */}
        <h2 className="text-heading-2 text-white mb-2 sm:mb-3 text-center font-['Space Grotesk'] tracking-tight relative">
          Start Your Journey
        </h2>

        {/* Subheading */}
        <p className="text-body text-[#b0b0b0] text-base sm:text-lg text-center mb-6 sm:mb-8 max-w-sm relative">
          Create your first trip and begin building your global footprint.
        </p>

        {/* CTA Button */}
        <Link
          href="/trip/new"
          className="btn-primary hover:shadow-[0_0_20px_rgba(195,244,0,0.4)] transition-all duration-300 flex items-center gap-2 group active:scale-95 relative"
        >
          <span>Plan Your First Trip</span>
          <span className="material-symbols-outlined text-sm group-hover:translate-x-2 transition-transform duration-300">
            arrow_forward
          </span>
        </Link>

        {/* Secondary CTA */}
        <p className="text-body-small text-[#808080] mt-6 sm:mt-8">
          Or{' '}
          <button className="text-[#8ff5ff] hover:underline transition-colors">
            explore samples
          </button>
        </p>
      </div>
    </div>
  )
}
