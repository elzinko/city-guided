import { createPoiController } from './controllers'
import { createAdminController } from './admin-controllers'
import type { PoiRepository } from '../persistence/in-memory-poi-repo'
import type { ExtendedPoiRepository, ZoneRepository } from '../persistence/prisma-poi-repo'

interface RoutesDeps {
  poiRepo: PoiRepository | ExtendedPoiRepository
  zoneRepo?: ZoneRepository | null
}

export function createRoutes({ poiRepo, zoneRepo }: RoutesDeps): any[] {
  const controller = createPoiController({ poiRepo })

  const routes = [
    {
      method: 'GET',
      url: '/api/pois',
      handler: controller.getNearbyPois,
    },
    {
      method: 'GET',
      url: '/api/pois/:id',
      handler: controller.getPoiById,
    },
    {
      method: 'POST',
      url: '/api/admin/pois',
      handler: controller.createPoi,
    },
    {
      method: 'PUT',
      url: '/api/admin/pois/:id',
      handler: controller.updatePoi,
    },
    {
      method: 'DELETE',
      url: '/api/admin/pois/:id',
      handler: controller.deletePoi,
    },
    {
      method: 'GET',
      url: '/api/health',
      handler: async () => ({ status: 'ok' }),
    },
    {
      method: 'GET',
      url: '/api/osrm/route',
      handler: controller.proxyOsrmRoute,
    },
  ]

  // Ajouter les routes admin si le zoneRepo est disponible (Prisma)
  if (zoneRepo) {
    const adminController = createAdminController({ 
      poiRepo: poiRepo as ExtendedPoiRepository, 
      zoneRepo 
    })

    routes.push(
      // Zones
      {
        method: 'GET',
        url: '/api/admin/zones',
        handler: adminController.getZones,
      },
      {
        method: 'GET',
        url: '/api/admin/zones/:id',
        handler: adminController.getZone,
      },
      {
        method: 'POST',
        url: '/api/admin/zones',
        handler: adminController.createZone,
      },
      {
        method: 'GET',
        url: '/api/admin/zones/:id/pois',
        handler: adminController.getZonePois,
      },
      // Import
      {
        method: 'POST',
        url: '/api/admin/import/:id',
        handler: adminController.startImport,
      },
      {
        method: 'GET',
        url: '/api/admin/import/:id/status',
        handler: adminController.getImportStatus,
      },
      // Audio Guide Generation (Ollama)
      {
        method: 'GET',
        url: '/api/admin/ollama/status',
        handler: adminController.checkOllamaStatus,
      },
      {
        method: 'POST',
        url: '/api/admin/pois/:id/generate-audio',
        handler: adminController.generateAudioGuide as any,
      },
      {
        method: 'GET',
        url: '/api/admin/pois/:id/segments',
        handler: adminController.getPoiSegments,
      },
    )
  }

  return routes
}
