import { describe, it, expect } from 'vitest'
import { InMemoryPoiRepository } from '../../infrastructure/persistence/in-memory-poi-repo'
import { getNearbyPois } from './get-nearby-pois'

describe('getNearbyPois', () => {
  it('returns nearby pois within radius', async () => {
    const repo = new InMemoryPoiRepository()
    const res = await getNearbyPois(repo, { lat: 48.8570, lng: 2.3510, radiusMeters: 200 })
    expect(res.length).toBeGreaterThan(0)
    expect(res[0]).toHaveProperty('distanceMeters')
  })
})
