// Emoji categories with Apple-style emojis and skin tone support
export interface EmojiCategory {
  name: string
  icon: string
  emojis: string[]
}

export interface SkinTone {
  name: string
  code: string
  modifier: string // Unicode modifier
}

// Fitzpatrick Scale skin tones for modifying base emojis
export const SKIN_TONES: SkinTone[] = [
  { name: 'Original', code: 'original', modifier: '' },
  { name: 'Light', code: 'light', modifier: '🏻' },
  { name: 'Fair', code: 'fair', modifier: '🏼' },
  { name: 'Medium', code: 'medium', modifier: '🏽' },
  { name: 'Deep', code: 'deep', modifier: '🏾' },
  { name: 'Dark', code: 'dark', modifier: '🏿' },
]

// Base human emojis that support skin tones (selection of common ones)
export const SKIN_TONE_EMOJIS = [
  '👋', // waving hand
  '👏', // clapping hands
  '👍', // thumbs up
  '👎', // thumbs down
  '✊', // fist
  '👊', // punch
  '✌️', // victory
  '🤞', // cross fingers
  '🤟', // sign of the horns
  '🤘', // call me hand
  '👌', // ok hand
  '🤌', // pinched fingers
  '🤏', // pinching hand
  '👈', // pointing left
  '👉', // pointing right
  '👆', // pointing up
  '👇', // pointing down
  '☝️', // pointing up 2
  '🫵', // pointing at you
  '👐', // open hands
  '🙌', // raised hands
  '🙏', // folded hands
  '💅', // nail polish
  '🤳', // selfie
  '💪', // flexed biceps
  '👶', // baby
  '👧', // girl
  '🧒', // child
  '👦', // boy
  '👩', // woman
  '👨', // man
  '🧑', // adult
  '👴', // old man
  '👵', // old woman
  '👨‍⚕️', // man health worker
  '👩‍⚕️', // woman health worker
  '👨‍🎓', // man student
  '👩‍🎓', // woman student
  '👨‍🏫', // man teacher
  '👩‍🏫', // woman teacher
  '👨‍⚖️', // man judge
  '👩‍⚖️', // woman judge
  '👨‍🌾', // man farmer
  '👩‍🌾', // woman farmer
  '👨‍🍳', // man cook
  '👩‍🍳', // woman cook
  '👨‍🔧', // man mechanic
  '👩‍🔧', // woman mechanic
  '👨‍🏭', // man factory worker
  '👩‍🏭', // woman factory worker
  '👨‍💼', // man office worker
  '👩‍💼', // woman office worker
  '👨‍💻', // man technologist
  '👩‍💻', // woman technologist
  '👨‍🎤', // man singer
  '👩‍🎤', // woman singer
  '👨‍🎨', // man artist
  '👩‍🎨', // woman artist
  '👨‍🚒', // man firefighter
  '👩‍🚒', // woman firefighter
  '👨‍✈️', // man pilot
  '👩‍✈️', // woman pilot
  '👨‍🚀', // man astronaut
  '👩‍🚀', // woman astronaut
]

// Emoji categories organized by type
export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
      '🤪', '😌', '😔', '😑', '😐', '🥬', '😏', '😒',
      '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴',
      '😷', '🤒', '🤕', '🤢', '🤮', '🤮', '🤧', '🤬',
      '🤯', '😳', '😵', '🥴', '😕', '😟', '🙁', '☹️',
      '😲', '😞', '😖', '😢', '😭', '😱', '😖', '😣',
      '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
      '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹',
      '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹',
      '😻', '😼', '😽', '🙀', '😿', '😾',
    ],
  },
  {
    name: 'Gestures',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
      '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎',
      '✊', '👊', '🫷', '🫸', '👏', '🙌', '👐', '🤲',
      '😾', '🤝', '🤜', '🤛', '🫱', '🫲', '💅', '🤳',
      '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🫀', '🫁',
      '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄',
    ],
  },
  {
    name: 'People',
    icon: '👶',
    emojis: SKIN_TONE_EMOJIS,
  },
  {
    name: 'Nature',
    icon: '🌿',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
      '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈',
      '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣',
      '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴',
      '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜',
      '🪰', '🐢', '🐍', '🐙', '🦑', '🦐', '🦞', '🦀',
      '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊',
      '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏',
      '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎',
      '🐖', '🐏', '🐑', '🧐', '🐐', '🦌', '🐕', '🐩',
      '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦗',
      '🥚', '🍃', '🍂', '🍁', '🌾', '💐', '🌷', '🌹',
      '🥀', '🌺', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚',
      '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔',
      '🌚', '🌝', '🌞', '⭐', '🌟', '✨', '⚡', '☄️',
      '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️',
      '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️',
      '⛄', '🌬️', '💨', '💧', '💦', '☔', '🍏', '🍎',
      '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅',
      '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕',
      '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖',
      '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓',
      '🥔', '🍤', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕',
      '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫',
      '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪',
      '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢',
      '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🍮',
      '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🍯',
      '🥛', '🍼', '☕', '🍵', '🍶', '🍾', '🍷', '🍸',
      '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉',
      '🧊', '🥢', '🍽️', '🍴', '🥄', '🔪', '🏺', '🌱',
      '🌲', '🌳', '🌴', '🌵', '🎄', '🎍', '🎎', '🎏',
      '🎀', '🎁', '🎈', '🎉', '🎊', '🎎', '🏵️', '🎗️',
      '🎫', '🎖️', '🎗️', '🏆', '🏅', '🥇', '🥈', '🥉',
      '⭐', '🌟', '✨',
    ],
  },
  {
    name: 'Food',
    icon: '🍎',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇',
      '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
      '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️',
      '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯',
      '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞',
      '🧇', '🥓', '🥔', '🍤', '🍗', '🍖', '🌭', '🍔',
      '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗',
      '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱',
      '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠',
      '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂',
      '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪',
      '🌰', '🍯', '🥛', '🍼', '☕', '🍵', '🍶', '🍾',
      '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤',
      '🧃', '🧉', '🧊', '🥢', '🍽️', '🍴', '🥄', '🔪',
    ],
  },
  {
    name: 'Travel',
    icon: '✈️',
    emojis: [
      '✈️', '🚀', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆',
      '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌',
      '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕',
      '🚖', '🚗', '🚘', '🚙', '🚚', '🚛', '🚜', '🏎️',
      '🏍️', '🛵', '🦯', '🦽', '🦼', '🛺', '🚲', '🛴',
      '🛹', '🛼', '🛶', '⛵', '🚤', '🛳️', '⛴️', '🛥️',
      '🚢', '🚧', '⛽', '🚨', '🚔', '🚍', '🚘', '🚖',
      '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄',
      '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️',
      '🛫', '🛬', '🛰️', '🚁', '🛶', '⛵', '🚤', '🛳️',
      '⛴️', '🛥️', '🚢', '🚧', '⛽', '🚨', '🚥', '🚦',
      '🛣️', '🛤️', '🛢️', '⛽', '🎡', '🎢', '🎠', '⛲',
      '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢',
      '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫',
      '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋',
      '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄',
      '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌',
      '🌉', '🌁', '⌚', '📱', '📲', '💻', '⌨️', '🖥️',
      '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿',
      '📀', '📼', '🧮', '🎥', '🎬', '📺', '📷', '📸',
      '📹', '🎞️', '📽️', '🎦', '📞', '☎️', '📟', '📠',
      '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️',
      '⏰', '🕰️', '⌚', '📡', '🔋', '🔌', '💡', '🔦',
      '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶',
      '💷', '💰', '💳', '🧾', '✉️', '📩', '📨', '📤',
      '📥', '📦', '🏷️', '🧧', '📪', '📫', '📬', '📭',
      '📮', '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🖍️', '📝',
    ],
  },
  {
    name: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳',
      '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳',
      '⛸️', '🎣', '🎽', '🎿', '⛷️', '🏂', '🪂', '🏋️',
      '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘',
      '🏄', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎯',
      '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁',
      '🎷', '🎺', '🎸', '🎻', '🎲', '♟️', '🎭', '🎮',
      '🎰', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️',
      '🏍️', '🛵', '🦯', '🚲', '🛴', '🚏', '⛽', '🚨',
      '🚥', '🚦', '🛑', '🚧', '⚓', '⛽', '🚧', '🔧',
      '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️',
      '🧲', '🔫', '💣', '🔪', '🗡️', '⚔️', '🛡️', '🚬',
      '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️',
      '🔭', '🔬', '🕯️', '💡', '🔦', '🏮', '📔', '📕',
      '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📑',
      '🧷', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁',
      '🛀', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🚬', '⚰️',
      '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭',
      '🔬', '🕯️', '💡', '🔦', '🏮', '📔', '📕', '📖',
    ],
  },
  {
    name: 'Flags',
    icon: '🌍',
    emojis: [
      '🇦🇩', '🇦🇪', '🇦🇫', '🇦🇬', '🇦🇮', '🇦🇱', '🇦🇲', '🇦🇴',
      '🇦🇶', '🇦🇷', '🇦🇸', '🇦🇹', '🇦🇺', '🇦🇼', '🇦🇽', '🇦🇿',
      '🇧🇦', '🇧🇧', '🇧🇩', '🇧🇪', '🇧🇫', '🇧🇬', '🇧🇭', '🇧🇮',
      '🇧🇯', '🇧🇱', '🇧🇲', '🇧🇳', '🇧🇴', '🇧🇶', '🇧🇷', '🇧🇸',
      '🇧🇹', '🇧🇻', '🇧🇼', '🇧🇾', '🇧🇿', '🇨🇦', '🇨🇨', '🇨🇩',
      '🇨🇫', '🇨🇬', '🇨🇭', '🇨🇮', '🇨🇰', '🇨🇱', '🇨🇲', '🇨🇳',
      '🇨🇴', '🇨🇵', '🇨🇷', '🇨🇺', '🇨🇻', '🇨🇼', '🇨🇽', '🇨🇾',
      '🇨🇿', '🇩🇪', '🇩🇬', '🇩🇯', '🇩🇰', '🇩🇲', '🇩🇴', '🇩🇿',
      '🇪🇨', '🇪🇪', '🇪🇬', '🇪🇭', '🇪🇷', '🇪🇸', '🇪🇹', '🇪🇺',
      '🇫🇮', '🇫🇯', '🇫🇰', '🇫🇲', '🇫🇴', '🇫🇷', '🇬🇦', '🇬🇧',
      '🇬🇩', '🇬🇪', '🇬🇫', '🇬🇬', '🇬🇭', '🇬🇮', '🇬🇱', '🇬🇲',
      '🇬🇳', '🇬🇵', '🇬🇶', '🇬🇷', '🇬🇸', '🇬🇹', '🇬🇺', '🇬🇼',
      '🇬🇾', '🇭🇰', '🇭🇲', '🇭🇳', '🇭🇷', '🇭🇹', '🇭🇺', '🇮🇩',
      '🇮🇪', '🇮🇱', '🇮🇲', '🇮🇳', '🇮🇴', '🇮🇶', '🇮🇷', '🇮🇸',
      '🇮🇹', '🇯🇪', '🇯🇲', '🇯🇴', '🇯🇵', '🇰🇪', '🇰🇬', '🇰🇭',
      '🇰🇮', '🇰🇲', '🇰🇳', '🇰🇵', '🇰🇷', '🇰🇼', '🇰🇿', '🇱🇦',
      '🇱🇧', '🇱🇨', '🇱🇮', '🇱🇰', '🇱🇷', '🇱🇸', '🇱🇹', '🇱🇺',
      '🇱🇻', '🇱🇾', '🇲🇦', '🇲🇨', '🇲🇩', '🇲🇪', '🇲🇫', '🇲🇬',
      '🇲🇭', '🇲🇰', '🇲🇱', '🇲🇲', '🇲🇳', '🇲🇴', '🇲🇵', '🇲🇶',
      '🇲🇷', '🇲🇸', '🇲🇹', '🇲🇺', '🇲🇻', '🇲🇼', '🇲🇽', '🇲🇾',
      '🇲🇿', '🇳🇦', '🇳🇨', '🇳🇪', '🇳🇫', '🇳🇬', '🇳🇮', '🇳🇱',
      '🇳🇴', '🇳🇵', '🇳🇷', '🇳🇺', '🇳🇿', '🇴🇲', '🇵🇦', '🇵🇪',
      '🇵🇫', '🇵🇬', '🇵🇭', '🇵🇰', '🇵🇱', '🇵🇲', '🇵🇳', '🇵🇷',
      '🇵🇸', '🇵🇹', '🇵🇼', '🇵🇾', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇸',
      '🇷🇺', '🇷🇼', '🇸🇦', '🇸🇧', '🇸🇨', '🇸🇩', '🇸🇪', '🇸🇬',
      '🇸🇭', '🇸🇮', '🇸🇯', '🇸🇰', '🇸🇱', '🇸🇲', '🇸🇳', '🇸🇴',
      '🇸🇷', '🇸🇸', '🇸🇹', '🇸🇻', '🇸🇽', '🇸🇾', '🇸🇿', '🇹🇦',
      '🇹🇨', '🇹🇩', '🇹🇫', '🇹🇬', '🇹🇭', '🇹🇯', '🇹🇰', '🇹🇱',
      '🇹🇲', '🇹🇳', '🇹🇴', '🇹🇷', '🇹🇹', '🇹🇻', '🇹🇼', '🇹🇿',
      '🇺🇦', '🇺🇬', '🇺🇲', '🇺🇳', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇦',
      '🇻🇨', '🇻🇪', '🇻🇬', '🇻🇮', '🇻🇳', '🇻🇺', '🇼🇫', '🇼🇸',
      '🇾🇪', '🇾🇹', '🇿🇦', '🇿🇲', '🇿🇼',
    ],
  },
]

// Helper function to check if an emoji supports skin tones
export function supportsSkinTone(emoji: string): boolean {
  if (!emoji) return false
  
  const base = emoji.split('\u200D')[0].replace(/\uFE0F/g, '');
  
  // Check our explicit list first
  if (SKIN_TONE_EMOJIS.some(e => e.startsWith(base))) return true;
  
  // Check common ranges for human-like emojis
  const code = base.codePointAt(0) || 0;
  
  // Explicitly exclude non-human body parts and characters that show as squares
  if (
    code === 0x1F9B4 || code === 0x1F9B7 || code === 0x1F9E0 || // Bone, Tooth, Brain
    code === 0x1F440 || code === 0x1F441 || // Eyes, Eye
    code === 0x1F444 || code === 0x1F445 || // Mouth/Lips, Tongue
    code === 0x1F9DE || code === 0x1F9DF    // Genie, Zombie
  ) return false;
  
  return (
    (code >= 0x1F442 && code <= 0x1F487) || // Body parts, hands, people
    (code >= 0x1F4AA && code <= 0x1F4AD) || // Biceps, etc
    (code >= 0x1F590 && code <= 0x1F596) || // Hand gestures
    (code >= 0x1F645 && code <= 0x1F647) || // People Gesturing (Excluding monkeys at 1F648-1F64A)
    (code >= 0x1F64B && code <= 0x1F64F) || // More gesturing people
    (code >= 0x1F6A3 && code <= 0x1F6CC) || // People in transport/activities
    (code >= 0x1F9B0 && code <= 0x1F9B9) || // Components (hair, leg, foot, superhero)
    (code >= 0x1F9D1 && code <= 0x1F9FF) || // People/Fantasy
    (code >= 0x270A && code <= 0x270D) ||   // Fists, Victory, Writing
    (code === 0x261D)                      // Pointing Up
  );
}

// Helper function to apply skin tone to an emoji
export function applySkinTone(emoji: string, skinTone: string): string {
  if (!emoji || !skinTone) return emoji;

  // First, strip any existing skin tone modifiers
  const toneModifiers = ['🏻', '🏼', '🏽', '🏾', '🏿'];
  let baseEmoji = emoji;
  toneModifiers.forEach(m => {
    baseEmoji = baseEmoji.replace(new RegExp(m, 'g'), '');
  });

  if (!supportsSkinTone(baseEmoji)) return baseEmoji;

  const modifier = SKIN_TONES.find(st => st.code === skinTone)?.modifier
  if (!modifier) return baseEmoji

  // Strip Variation Selector 16 (\uFE0F) if present
  const cleanBase = baseEmoji.replace(/\uFE0F/g, '');

  // Handle ZWJ sequences
  if (cleanBase.includes('\u200D')) {
    const parts = cleanBase.split('\u200D');
    return parts[0] + modifier + '\u200D' + parts.slice(1).join('\u200D');
  }

  return cleanBase + modifier;
}
