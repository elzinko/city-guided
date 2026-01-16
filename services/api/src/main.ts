import Fastify from 'fastify'
import cors from '@fastify/cors'
import { createRoutes } from './infrastructure/http/routes'

async function bootstrap() {
  const server = Fastify({ logger: true })
  await server.register(cors, { origin: true })

  // instantiate repos/adapters
  const { InMemoryPoiRepository } = await import('./infrastructure/persistence/in-memory-poi-repo')
  const poiRepo = new InMemoryPoiRepository()

  // create and register routes
  const routes = createRoutes({ poiRepo })
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