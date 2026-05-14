import { applySkinTone } from '@/lib/emoji-categories'

interface EmojiAvatarProps {
  emoji: string
  skinTone: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function EmojiAvatar({ emoji = '✈️', skinTone, className = '', size = 'md' }: EmojiAvatarProps) {
  const isUrl = emoji?.startsWith('http') || emoji?.startsWith('/')
  const modifiedEmoji = !isUrl ? applySkinTone(emoji || '✈️', skinTone) : emoji

  const sizeClasses = {
    sm: 'text-lg w-7 h-7',
    md: 'text-2xl w-10 h-10',
    lg: 'text-3xl w-12 h-12',
    xl: 'text-6xl w-32 h-32'
  }

  return (
    <div className={`flex items-center justify-center rounded-2xl bg-slate-800 shadow-inner overflow-hidden ${sizeClasses[size]} ${className}`}>
      {isUrl ? (
        <img src={emoji} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <span>
          {modifiedEmoji}
        </span>
      )}
    </div>
  )
}
