import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Zones initiales pour l'import de POIs
const INITIAL_ZONES = [
  { 
    name: 'Marseille', 
    lat: 43.2965, 
    lng: 5.3698, 
    radiusKm: 5 
  },
  { 
    name: 'Fontainebleau', 
    lat: 48.4049, 
    lng: 2.7019, 
    radiusKm: 5 
  },
]

async function main() {
  console.log('Seeding database...')

  for (const zone of INITIAL_ZONES) {
    const created = await prisma.zone.upsert({
      where: { name: zone.name },
      update: {
        lat: zone.lat,
        lng: zone.lng,
        radiusKm: zone.radiusKm,
      },
      create: zone,
    })
    console.log(`  Zone créée/mise à jour: ${created.name} (${created.id})`)
  }

  console.log('Seeding terminé.')
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
