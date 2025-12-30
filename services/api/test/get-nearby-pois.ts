import { InMemoryPoiRepository } from '../src/infrastructure/persistence/in-memory-poi-repo'
import { getNearbyPois } from '../src/domain/use-cases/get-nearby-pois'

async function run() {
  const repo = new InMemoryPoiRepository()
  const res = await getNearbyPois(repo, { lat: 48.8570, lng: 2.3510, radiusMeters: 200 })
  console.log('Nearby POIs (within 200m):', res.map((r) => ({ id: r.id, name: r.name, d: Math.round(r.distanceMeters) })))
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})