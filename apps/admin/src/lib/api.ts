// API client pour l'admin

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'dev-secret'

interface Zone {
  id: string
  name: string
  lat: number
  lng: number
  radiusKm: number
  lastImportAt: string | null
  poiCount: number
}

interface Poi {
  id: string
  name: string
  lat: number
  lng: number
  radiusMeters: number
  category: string
  shortDescription: string
  fullDescription?: string
  otmId?: string
  otmKinds?: string[]
  otmRate?: number
  wikidataId?: string
  wikidataDescription?: string
  imageUrl?: string
  wikipediaUrl?: string
  importedAt?: string
  updatedAt?: string
}

interface ImportStatus {
  zoneId: string
  status: 'pending' | 'fetching' | 'enriching' | 'saving' | 'completed' | 'error'
  progress: number
  total: number
  created: number
  updated: number
  error?: string
  startedAt: string
  completedAt?: string
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`
  
  const headers: Record<string, string> = {
    'X-Admin-Token': ADMIN_TOKEN,
    ...(options.headers as Record<string, string>),
  }

  // Only add Content-Type for requests with body
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || `API error: ${response.status}`)
  }

  return response.json()
}

// Zones
export async function getZones(): Promise<Zone[]> {
  return apiFetch<Zone[]>('/api/admin/zones')
}

export async function getZone(id: string): Promise<Zone> {
  return apiFetch<Zone>(`/api/admin/zones/${id}`)
}

export async function createZone(data: { name: string; lat: number; lng: number; radiusKm?: number }): Promise<Zone> {
  return apiFetch<Zone>('/api/admin/zones', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// POIs
export async function getZonePois(zoneId: string): Promise<{ zone: Zone; pois: Poi[] }> {
  return apiFetch<{ zone: Zone; pois: Poi[] }>(`/api/admin/zones/${zoneId}/pois`)
}

export async function getPoi(id: string): Promise<Poi> {
  return apiFetch<Poi>(`/api/pois/${id}`)
}

// Import
export async function startImport(zoneId: string): Promise<{ message: string; statusUrl: string }> {
  return apiFetch<{ message: string; statusUrl: string }>(`/api/admin/import/${zoneId}`, {
    method: 'POST',
  })
}

export async function getImportStatus(zoneId: string): Promise<ImportStatus> {
  return apiFetch<ImportStatus>(`/api/admin/import/${zoneId}/status`)
}

export type { Zone, Poi, ImportStatus }
