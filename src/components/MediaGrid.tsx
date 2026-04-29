import { FormLabel } from './FormLayout'

interface MediaGridProps {
  photos: string[]
  editing: boolean
  onMediaClick: (idx: number) => void
  onRemove: (idx: number) => void
  onAdd: () => void
  aspectRatio?: 'video' | 'square'
}

function getMediaType(url: string): 'image' | 'video' {
  const low = url.toLowerCase()
  if (low.includes('video') || low.match(/\.(mp4|webm|ogg|mov)$/i) || low.startsWith('data:video')) return 'video'
  return 'image'
}

export function MediaGrid({ 
  photos, 
  editing, 
  onMediaClick, 
  onRemove, 
  onAdd,
  aspectRatio = 'video'
}: MediaGridProps) {
  const aspectClass = aspectRatio === 'video' ? 'aspect-video' : 'aspect-square'
  
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((url, idx) => (
          <div key={`photo-${idx}`} className={`relative ${aspectClass} rounded-xl overflow-hidden group border border-white/5 bg-white/5 shadow-lg shadow-black/20`}>
            {getMediaType(url) === 'video' ? (
              <div className="relative w-full h-full cursor-pointer" onClick={() => onMediaClick(idx)}>
                <video src={url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                  <span className="material-symbols-outlined text-white text-3xl">play_circle</span>
                </div>
              </div>
            ) : (
              <img 
                src={url} 
                alt={`Photo ${idx + 1}`} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                onClick={() => onMediaClick(idx)}
              />
            )}
            {editing && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(idx)
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
        ))}
        {editing && (
          <button
            key="add-media-button"
            onClick={onAdd}
            className={`${aspectClass} rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all flex flex-col items-center justify-center gap-2 group`}
          >
            <span className="material-symbols-outlined text-white/40 group-hover:text-white group-hover:scale-110 transition-all">search</span>
            <span className="text-[10px] font-bold text-white/20 group-hover:text-white/60">Add Media</span>
          </button>
        )}
      </div>
      {!editing && photos.length === 0 && (
        <div className="py-8 flex flex-col items-center gap-2 opacity-20">
          <span className="material-symbols-outlined text-4xl">no_photography</span>
          <p className="text-xs font-bold">No photos added</p>
        </div>
      )}
    </div>
  )
}
