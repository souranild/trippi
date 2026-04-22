export interface TintColor {
  hex: string
  rgb: [number, number, number]
}

const DEFAULT_TINT: TintColor = {
  hex: '#8ff5ff',
  rgb: [143, 245, 255],
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toHex([r, g, b]: [number, number, number]): string {
  const toPart = (v: number) => v.toString(16).padStart(2, '0')
  return `#${toPart(r)}${toPart(g)}${toPart(b)}`
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) return [0, 0, l]

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)

  let h = 0
  if (max === rn) h = (gn - bn) / delta + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / delta + 2
  else h = (rn - gn) / delta + 4
  h /= 6

  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const value = Math.round(l * 255)
    return [value, value, value]
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return [
    Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, h) * 255),
    Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  ]
}

function hashFallbackTint(seed: string): TintColor {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }

  const hue = Math.abs(hash % 360) / 360
  const rgb = hslToRgb(hue, 0.78, 0.62)
  return { hex: toHex(rgb), rgb }
}

export async function extractWallpaperTint(imageUrl?: string): Promise<TintColor> {
  if (!imageUrl) return DEFAULT_TINT

  try {
    if (typeof window === 'undefined') return DEFAULT_TINT

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load wallpaper for tint extraction'))
      img.src = imageUrl
    })

    const canvas = document.createElement('canvas')
    const maxSide = 72
    const scale = Math.min(maxSide / img.width, maxSide / img.height, 1)
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return hashFallbackTint(imageUrl)

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

    let bestScore = -1
    let bestRgb: [number, number, number] | null = null

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const alpha = data[i + 3]
      if (alpha < 180) continue

      const [, sat, light] = rgbToHsl(r, g, b)
      if (sat < 0.2 || light < 0.16 || light > 0.84) continue

      const vibrance = sat * (1 - Math.abs(light - 0.55))
      if (vibrance > bestScore) {
        bestScore = vibrance
        bestRgb = [r, g, b]
      }
    }

    if (!bestRgb) return hashFallbackTint(imageUrl)

    const [h, s, l] = rgbToHsl(bestRgb[0], bestRgb[1], bestRgb[2])
    const tuned = hslToRgb(h, clamp(s + 0.08, 0.45, 0.9), clamp(l, 0.42, 0.68))

    return {
      hex: toHex(tuned),
      rgb: tuned,
    }
  } catch {
    return hashFallbackTint(imageUrl)
  }
}

export function defaultWallpaperTint(): TintColor {
  return DEFAULT_TINT
}
