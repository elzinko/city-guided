import { distanceMeters } from '../../infrastructure/geo/haversine'
import { Poi } from '@city-guided/domain'

export type GetNearbyInput = {
  lat: number
  lng: number
  radiusMeters?: number
  category?: string
}

export async function getNearbyPois(repo: { findAll(): Promise<Poi[]> }, input: GetNearbyInput): Promise<(Poi & { distanceMeters: number })[]> {
  const { lat, lng, radiusMeters = 500, category } = input
  const all = await repo.findAll()
  return all
    .filter((p) => (category ? p.category === category : true))
    .map((p) => ({ ...p, distanceMeters: distanceMeters(lat, lng, p.lat, p.lng) }))
    .filter((p) => p.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
}