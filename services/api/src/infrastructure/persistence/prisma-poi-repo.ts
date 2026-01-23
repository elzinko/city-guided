import { prisma, type Poi as PrismaPoi, type Zone as PrismaZone } from '@city-guided/database'
import type { Poi, Category } from '@city-guided/domain'
import type { PoiRepository } from './in-memory-poi-repo'

// Types étendus pour les données Prisma
export interface ExtendedPoi extends Poi {
  otmId?: string | null
  otmKinds?: string[]
  otmRate?: number | null
  wikidataId?: string | null
  wikidataDescription?: string | null
  imageUrl?: string | null
  wikipediaUrl?: string | null
  wikipediaContent?: string | null  // Contenu Wikipedia complet pour génération audio
  zoneId?: string
  importedAt?: Date
  updatedAt?: Date
}

export interface Zone {
  id: string
  name: string
  lat: number
  lng: number
  radiusKm: number
  lastImportAt?: Date | null
  poiCount: number
}

export interface ZoneRepository {
  findAll(): Promise<Zone[]>
  findById(id: string): Promise<Zone | null>
  findByName(name: string): Promise<Zone | null>
  create(zone: Omit<Zone, 'id' | 'poiCount'>): Promise<Zone>
  updateImportStats(id: string, poiCount: number): Promise<Zone | null>
}

export interface ExtendedPoiRepository extends PoiRepository {
  findByZone(zoneId: string): Promise<ExtendedPoi[]>
  findByOtmId(otmId: string): Promise<ExtendedPoi | null>
  upsertFromImport(poi: Omit<ExtendedPoi, 'id'>, zoneId: string): Promise<ExtendedPoi>
  bulkUpsertFromImport(pois: Array<Omit<ExtendedPoi, 'id'>>, zoneId: string): Promise<{ created: number; updated: number }>
}

// Convertir Prisma Poi → Domain Poi
function prismaToDomain(p: PrismaPoi): ExtendedPoi {
  return {
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    radiusMeters: p.radiusMeters,
    category: p.category as Category,
    shortDescription: p.shortDescription,
    fullDescription: p.fullDescription || undefined,
    ttsText: p.ttsText || undefined,
    storySegments: p.storySegments,
    otmId: p.otmId,
    otmKinds: p.otmKinds,
    otmRate: p.otmRate,
    wikidataId: p.wikidataId,
    wikidataDescription: p.wikidataDescription,
    imageUrl: p.imageUrl,
    wikipediaUrl: p.wikipediaUrl,
    wikipediaContent: p.wikipediaContent,
    zoneId: p.zoneId,
    importedAt: p.importedAt,
    updatedAt: p.updatedAt,
  }
}

function prismaZoneToDomain(z: PrismaZone): Zone {
  return {
    id: z.id,
    name: z.name,
    lat: z.lat,
    lng: z.lng,
    radiusKm: z.radiusKm,
    lastImportAt: z.lastImportAt,
    poiCount: z.poiCount,
  }
}

export class PrismaPoiRepository implements ExtendedPoiRepository {
  async findAll(): Promise<ExtendedPoi[]> {
    const pois = await prisma.poi.findMany({
      orderBy: { name: 'asc' },
    })
    return pois.map(prismaToDomain)
  }

  async findById(id: string): Promise<ExtendedPoi | null> {
    const poi = await prisma.poi.findUnique({ where: { id } })
    return poi ? prismaToDomain(poi) : null
  }

  async findByZone(zoneId: string): Promise<ExtendedPoi[]> {
    const pois = await prisma.poi.findMany({
      where: { zoneId },
      orderBy: { name: 'asc' },
    })
    return pois.map(prismaToDomain)
  }

  async findByOtmId(otmId: string): Promise<ExtendedPoi | null> {
    const poi = await prisma.poi.findUnique({ where: { otmId } })
    return poi ? prismaToDomain(poi) : null
  }

  async create(p: Omit<ExtendedPoi, 'id'>): Promise<ExtendedPoi> {
    if (!p.zoneId) {
      throw new Error('zoneId is required for creating a POI')
    }

    const poi = await prisma.poi.create({
      data: {
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        radiusMeters: p.radiusMeters,
        category: p.category,
        shortDescription: p.shortDescription,
        fullDescription: p.fullDescription,
        ttsText: p.ttsText,
        storySegments: p.storySegments || [],
        otmId: p.otmId,
        otmKinds: p.otmKinds || [],
        otmRate: p.otmRate,
        wikidataId: p.wikidataId,
        wikidataDescription: p.wikidataDescription,
        imageUrl: p.imageUrl,
        wikipediaUrl: p.wikipediaUrl,
        zoneId: p.zoneId,
      },
    })
    return prismaToDomain(poi)
  }

  async update(id: string, p: Partial<ExtendedPoi>): Promise<ExtendedPoi | null> {
    try {
      const poi = await prisma.poi.update({
        where: { id },
        data: {
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          radiusMeters: p.radiusMeters,
          category: p.category,
          shortDescription: p.shortDescription,
          fullDescription: p.fullDescription,
          ttsText: p.ttsText,
          storySegments: p.storySegments,
          otmId: p.otmId,
          otmKinds: p.otmKinds,
          otmRate: p.otmRate,
          wikidataId: p.wikidataId,
          wikidataDescription: p.wikidataDescription,
          imageUrl: p.imageUrl,
          wikipediaUrl: p.wikipediaUrl,
        },
      })
      return prismaToDomain(poi)
    } catch {
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.poi.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  }

  async upsertFromImport(poi: Omit<ExtendedPoi, 'id'>, zoneId: string): Promise<ExtendedPoi> {
    if (!poi.otmId) {
      // Pas d'otmId, créer directement
      return this.create({ ...poi, zoneId })
    }

    const upserted = await prisma.poi.upsert({
      where: { otmId: poi.otmId },
      create: {
        name: poi.name,
        lat: poi.lat,
        lng: poi.lng,
        radiusMeters: poi.radiusMeters || 50,
        category: poi.category,
        shortDescription: poi.shortDescription,
        fullDescription: poi.fullDescription,
        ttsText: poi.ttsText,
        storySegments: poi.storySegments || [],
        otmId: poi.otmId,
        otmKinds: poi.otmKinds || [],
        otmRate: poi.otmRate,
        wikidataId: poi.wikidataId,
        wikidataDescription: poi.wikidataDescription,
        imageUrl: poi.imageUrl,
        wikipediaUrl: poi.wikipediaUrl,
        wikipediaContent: poi.wikipediaContent,
        zoneId,
      },
      update: {
        name: poi.name,
        lat: poi.lat,
        lng: poi.lng,
        category: poi.category,
        shortDescription: poi.shortDescription,
        fullDescription: poi.fullDescription,
        otmKinds: poi.otmKinds || [],
        otmRate: poi.otmRate,
        wikidataId: poi.wikidataId,
        wikidataDescription: poi.wikidataDescription,
        imageUrl: poi.imageUrl,
        wikipediaUrl: poi.wikipediaUrl,
        wikipediaContent: poi.wikipediaContent,
      },
    })

    return prismaToDomain(upserted)
  }

  async bulkUpsertFromImport(
    pois: Array<Omit<ExtendedPoi, 'id'>>,
    zoneId: string
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0

    // Utiliser une transaction pour la performance
    await prisma.$transaction(async (tx) => {
      for (const poi of pois) {
        if (poi.otmId) {
          const existing = await tx.poi.findUnique({ where: { otmId: poi.otmId } })
          
          if (existing) {
            await tx.poi.update({
              where: { otmId: poi.otmId },
              data: {
                name: poi.name,
                lat: poi.lat,
                lng: poi.lng,
                category: poi.category,
                shortDescription: poi.shortDescription,
                fullDescription: poi.fullDescription,
                otmKinds: poi.otmKinds || [],
                otmRate: poi.otmRate,
                wikidataId: poi.wikidataId,
                wikidataDescription: poi.wikidataDescription,
                imageUrl: poi.imageUrl,
                wikipediaUrl: poi.wikipediaUrl,
                wikipediaContent: poi.wikipediaContent,
              },
            })
            updated++
          } else {
            await tx.poi.create({
              data: {
                name: poi.name,
                lat: poi.lat,
                lng: poi.lng,
                radiusMeters: poi.radiusMeters || 50,
                category: poi.category,
                shortDescription: poi.shortDescription,
                fullDescription: poi.fullDescription,
                ttsText: poi.ttsText,
                storySegments: poi.storySegments || [],
                otmId: poi.otmId,
                otmKinds: poi.otmKinds || [],
                otmRate: poi.otmRate,
                wikidataId: poi.wikidataId,
                wikidataDescription: poi.wikidataDescription,
                imageUrl: poi.imageUrl,
                wikipediaUrl: poi.wikipediaUrl,
                wikipediaContent: poi.wikipediaContent,
                zoneId,
              },
            })
            created++
          }
        } else {
          await tx.poi.create({
            data: {
              name: poi.name,
              lat: poi.lat,
              lng: poi.lng,
              radiusMeters: poi.radiusMeters || 50,
              category: poi.category,
              shortDescription: poi.shortDescription,
              fullDescription: poi.fullDescription,
              ttsText: poi.ttsText,
              storySegments: poi.storySegments || [],
              otmKinds: poi.otmKinds || [],
              otmRate: poi.otmRate,
              wikidataId: poi.wikidataId,
              wikidataDescription: poi.wikidataDescription,
              imageUrl: poi.imageUrl,
              wikipediaUrl: poi.wikipediaUrl,
              wikipediaContent: poi.wikipediaContent,
              zoneId,
            },
          })
          created++
        }
      }
    })

    return { created, updated }
  }
}

export class PrismaZoneRepository implements ZoneRepository {
  async findAll(): Promise<Zone[]> {
    const zones = await prisma.zone.findMany({
      orderBy: { name: 'asc' },
    })
    return zones.map(prismaZoneToDomain)
  }

  async findById(id: string): Promise<Zone | null> {
    const zone = await prisma.zone.findUnique({ where: { id } })
    return zone ? prismaZoneToDomain(zone) : null
  }

  async findByName(name: string): Promise<Zone | null> {
    const zone = await prisma.zone.findUnique({ where: { name } })
    return zone ? prismaZoneToDomain(zone) : null
  }

  async create(zone: Omit<Zone, 'id' | 'poiCount'>): Promise<Zone> {
    const created = await prisma.zone.create({
      data: {
        name: zone.name,
        lat: zone.lat,
        lng: zone.lng,
        radiusKm: zone.radiusKm,
        lastImportAt: zone.lastImportAt,
      },
    })
    return prismaZoneToDomain(created)
  }

  async updateImportStats(id: string, poiCount: number): Promise<Zone | null> {
    try {
      const updated = await prisma.zone.update({
        where: { id },
        data: {
          poiCount,
          lastImportAt: new Date(),
        },
      })
      return prismaZoneToDomain(updated)
    } catch {
      return null
    }
  }
}
