import type { TransportMode } from '@/lib/storage'

export const TRANSPORT_MODES: {
  type: TransportMode
  label: string
  icon: string
  color: string
}[] = [
  { type: 'flight', label: 'Flight', icon: 'flight', color: 'text-sky-400' },
  { type: 'rail', label: 'Rail', icon: 'train', color: 'text-emerald-400' },
  { type: 'bus', label: 'Bus', icon: 'directions_bus', color: 'text-amber-400' },
  { type: 'car', label: 'Car', icon: 'directions_car', color: 'text-red-400' },
  { type: 'bike', label: 'Bike', icon: 'pedal_bike', color: 'text-orange-400' },
  { type: 'walk', label: 'Walk', icon: 'directions_walk', color: 'text-violet-400' },
]

export function normalizeTransportMode(t: string): TransportMode {
  if (t === 'train' || t === 'railway') return 'rail'
  if (t === 'flight' || t === 'rail' || t === 'bus' || t === 'car' || t === 'bike' || t === 'walk') {
    return t
  }
  return 'car'
}

export function transportModeLabel(type: string): string {
  const m = TRANSPORT_MODES.find((x) => x.type === normalizeTransportMode(type))
  return m?.label ?? 'Transit'
}

export function transportModeIcon(type: string): string {
  const m = TRANSPORT_MODES.find((x) => x.type === normalizeTransportMode(type))
  return m?.icon ?? 'transfer_within_a_station'
}
