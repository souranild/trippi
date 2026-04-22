// Profile utilities for Trippi
export interface Profile {
  name: string
  avatar: string
  character: string
  bio?: string
}

const firstNames = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Skyler', 'Reese',
  'Jamie', 'Robin', 'Sage', 'River', 'Phoenix', 'Blaze', 'Storm', 'Wolf', 'Raven', 'Lynx'
]

const lastNames = [
  'Explorer', 'Wanderer', 'Nomad', 'Voyager', 'Adventurer', 'Traveler', 'Journeyer', 'Roamer', 'Wayfarer', 'Pilgrim',
  'Seeker', 'Drifter', 'Rover', 'Globe-trotter', 'Odyssey', 'Expedition', 'Quest', 'Safari', 'Trekker', 'Pathfinder'
]

const characters = [
  // Original emojis
  '🧑‍🚀', '👨‍🚀', '👩‍🚀', '🧑‍🎨', '👨‍🎨', '👩‍🎨', '🧑‍💻', '👨‍💻', '👩‍💻', '🧑‍🔬', '👨‍🔬', '👩‍🔬',
  '🧑‍🏫', '👨‍🏫', '👩‍🏫', '🧑‍⚕️', '👨‍⚕️', '👩‍⚕️', '🧑‍⚖️', '👨‍⚖️', '👩‍⚖️', '🧑‍🌾', '👨‍🌾', '👩‍🌾',
  '🧑‍🍳', '👨‍🍳', '👩‍🍳', '🧑‍🎤', '👨‍🎤', '👩‍🎤', '🧑‍🎸', '👨‍🎸', '👩‍🎸', '🧑‍🎨', '👨‍🎨', '👩‍🎨',
  // Skin color variations for base emojis
  '🧑🏻‍🚀', '🧑🏼‍🚀', '🧑🏽‍🚀', '🧑🏾‍🚀', '🧑🏿‍🚀',
  '🧑🏻‍🎨', '🧑🏼‍🎨', '🧑🏽‍🎨', '🧑🏾‍🎨', '🧑🏿‍🎨',
  '🧑🏻‍💻', '🧑🏼‍💻', '🧑🏽‍💻', '🧑🏾‍💻', '🧑🏿‍💻',
  '🧑🏻‍🔬', '🧑🏼‍🔬', '🧑🏽‍🔬', '🧑🏾‍🔬', '🧑🏿‍🔬',
  '🧑🏻‍🏫', '🧑🏼‍🏫', '🧑🏽‍🏫', '🧑🏾‍🏫', '🧑🏿‍🏫',
  '🧑🏻‍⚕️', '🧑🏼‍⚕️', '🧑🏽‍⚕️', '🧑🏾‍⚕️', '🧑🏿‍⚕️',
  '🧑🏻‍⚖️', '🧑🏼‍⚖️', '🧑🏽‍⚖️', '🧑🏾‍⚖️', '🧑🏿‍⚖️',
  '🧑🏻‍🌾', '🧑🏼‍🌾', '🧑🏽‍🌾', '🧑🏾‍🌾', '🧑🏿‍🌾',
  '🧑🏻‍🍳', '🧑🏼‍🍳', '🧑🏽‍🍳', '🧑🏾‍🍳', '🧑🏿‍🍳',
  '🧑🏻‍🎤', '🧑🏼‍🎤', '🧑🏽‍🎤', '🧑🏾‍🎤', '🧑🏿‍🎤',
  '🧑🏻‍🎸', '🧑🏼‍🎸', '🧑🏽‍🎸', '🧑🏾‍🎸', '🧑🏿‍🎸'
]

export function generateRandomName(): string {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)]
  const last = lastNames[Math.floor(Math.random() * lastNames.length)]
  return `${first} ${last}`
}

export function generateRandomCharacter(): string {
  return characters[Math.floor(Math.random() * characters.length)]
}

export function getDefaultProfile(): Profile {
  return {
    name: generateRandomName(),
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    character: generateRandomCharacter(),
    bio: 'Adventure seeker and world explorer'
  }
}

export function loadProfile(): Profile {
  if (typeof window === 'undefined') return getDefaultProfile()
  const data = localStorage.getItem('trippi-profile')
  return data ? JSON.parse(data) : getDefaultProfile()
}

export function saveProfile(profile: Profile): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('trippi-profile', JSON.stringify(profile))
}