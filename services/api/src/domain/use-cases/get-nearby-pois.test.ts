import { describe, it, expect } from 'vitest'
import { InMemoryPoiRepository } from '../../infrastructure/persistence/in-memory-poi-repo'
import { getNearbyPois } from './get-nearby-pois'

describe('getNearbyPois', () => {
  let repo: InMemoryPoiRepository

  beforeEach(() => {
    repo = new InMemoryPoiRepository()
  })

  it('returns nearby pois within radius', async () => {
    const res = await getNearbyPois(repo, { lat: 48.8570, lng: 2.3510, radiusMeters: 200 })
    expect(res.length).toBeGreaterThan(0)
    expect(res[0]).toHaveProperty('distanceMeters')
    expect(res[0].distanceMeters).toBeLessThanOrEqual(200)
  })

  it('filters by category when specified', async () => {
    const res = await getNearbyPois(repo, {
      lat: 48.8570,
      lng: 2.3510,
      radiusMeters: 1000,
      category: 'Monuments'
    })
    expect(res.every(poi => poi.category === 'Monuments')).toBe(true)
  })

  it('returns empty array when no pois within radius', async () => {
    const res = await getNearbyPois(repo, { lat: 0, lng: 0, radiusMeters: 10 })
    expect(res).toHaveLength(0)
  })

  it('sorts results by distance ascending', async () => {
    const res = await getNearbyPois(repo, { lat: 48.8570, lng: 2.3510, radiusMeters: 5000 })
    for (let i = 1; i < res.length; i++) {
      expect(res[i].distanceMeters).toBeGreaterThanOrEqual(res[i - 1].distanceMeters)
    }
  })
})
