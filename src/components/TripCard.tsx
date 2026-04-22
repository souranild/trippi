import Link from 'next/link'
import Image from 'next/image'
import { Trip } from '@/lib/storage'

export default function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link href={`/trip/${trip.id}`}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden"
        style={trip.wallpaper ? { backgroundImage: `url(${trip.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {trip.wallpaper && <div className="absolute inset-0 bg-black bg-opacity-20"></div>}
        <div className="relative z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            {trip.emoji && <span className="mr-2">{trip.emoji}</span>}
            {trip.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{trip.startDate}{trip.endDate && ` - ${trip.endDate}`}</p>
          {trip.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{trip.description}</p>}
        </div>
      </div>
    </Link>
  )
}