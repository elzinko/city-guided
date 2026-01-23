import Fastify from 'fastify'
import cors from '@fastify/cors'
import { createRoutes } from './infrastructure/http/routes'
import type { PoiRepository } from './infrastructure/persistence/in-memory-poi-repo'

async function bootstrap() {
  const server = Fastify({ logger: true })
  await server.register(cors, { origin: true })

  // Choisir le repository selon la configuration
  let poiRepo: PoiRepository
  let zoneRepo = null
  
  if (process.env.DATABASE_URL) {
    // Utiliser Prisma avec PostgreSQL
    const { PrismaPoiRepository, PrismaZoneRepository } = await import('./infrastructure/persistence/prisma-poi-repo')
    poiRepo = new PrismaPoiRepository()
    zoneRepo = new PrismaZoneRepository()
    console.log('Using Prisma repository with PostgreSQL')
  } else {
    // Fallback sur InMemory pour dev sans DB
    const { InMemoryPoiRepository } = await import('./infrastructure/persistence/in-memory-poi-repo')
    poiRepo = new InMemoryPoiRepository()
    console.log('Using InMemory repository (no DATABASE_URL)')
  }

  // create and register routes
  const routes = createRoutes({ poiRepo, zoneRepo })
  routes.forEach((r) => server.route(r))

  const port = process.env.PORT ? Number(process.env.PORT) : 4000
  const host = process.env.HOST || '0.0.0.0'
  await server.listen({ port, host })
  console.log(`API listening on ${host}:${port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})