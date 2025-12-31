import { createPoiController } from './controllers'

export function createRoutes({ poiRepo }: { poiRepo: any }): any[] {
  const controller = createPoiController({ poiRepo })

  return [
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
}
