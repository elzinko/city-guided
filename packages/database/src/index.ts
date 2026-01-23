import { PrismaClient } from '@prisma/client'

// Singleton pattern pour éviter multiple instances en dev (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Re-export types from Prisma
export type { Poi, Zone, Category } from '@prisma/client'
export { Category as CategoryEnum } from '@prisma/client'

// Export Prisma client type
export type { PrismaClient }
