export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const toRad = (d: number) => (d * Math.PI) / 180
  const f1 = toRad(lat1)
  const f2 = toRad(lat2)
  const df = toRad(lat2 - lat1)
  const dl = toRad(lon2 - lon1)
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calcule le bearing (direction en degrés) entre deux points GPS
 * Retourne un angle en degrés (0-360), où 0 = Nord, 90 = Est, 180 = Sud, 270 = Ouest
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - 
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  
  const bearing = toDeg(Math.atan2(y, x))
  return (bearing + 360) % 360 // Normaliser entre 0-360
}

/**
 * Vérifie si un point est dans un cône de vision
 * @param fromLat Position de départ (lat)
 * @param fromLng Position de départ (lng)
 * @param heading Direction du mouvement en degrés (0-360)
 * @param targetLat Position cible (lat)
 * @param targetLng Position cible (lng)
 * @param coneAngle Angle du cône (ex: 60 = ±60° = 120° total)
 * @returns true si le point est dans le cône
 */
export function isInCone(
  fromLat: number,
  fromLng: number,
  heading: number,
  targetLat: number,
  targetLng: number,
  coneAngle: number = 60
): boolean {
  const bearingToTarget = calculateBearing(fromLat, fromLng, targetLat, targetLng)
  
  // Calculer la différence d'angle (prendre en compte le wrap-around à 360°)
  let diff = Math.abs(bearingToTarget - heading)
  if (diff > 180) {
    diff = 360 - diff
  }
  
  return diff <= coneAngle
}

/**
 * Filtre et trie les POIs par pertinence pour la navigation
 * @param pois Liste des POIs
 * @param currentLat Position actuelle (lat)
 * @param currentLng Position actuelle (lng)
 * @param heading Direction du mouvement en degrés (null si pas de mouvement)
 * @param maxDistance Distance max en mètres
 * @param coneAngle Angle du cône de vision en degrés
 * @returns POIs triés par distance, filtrés par cône si heading disponible
 */
export function filterPoisForNavigation(
  pois: Array<{ id: string; lat: number; lng: number; [key: string]: any }>,
  currentLat: number,
  currentLng: number,
  heading: number | null,
  maxDistance: number = 2000,
  coneAngle: number = 75
): Array<{ id: string; lat: number; lng: number; distance: number; [key: string]: any }> {
  // Calculer la distance pour chaque POI
  const poisWithDistance = pois.map(poi => ({
    ...poi,
    distance: distanceMeters(currentLat, currentLng, poi.lat, poi.lng)
  }))
  
  // Filtrer par distance max
  let filtered = poisWithDistance.filter(poi => poi.distance <= maxDistance)
  
  // Si on a un heading valide, filtrer par cône de direction
  if (heading !== null) {
    const inCone = filtered.filter(poi => 
      isInCone(currentLat, currentLng, heading, poi.lat, poi.lng, coneAngle)
    )
    // Si on trouve des POIs dans le cône, les utiliser, sinon garder tous (fallback)
    if (inCone.length > 0) {
      filtered = inCone
    }
  }
  
  // Trier par distance
  return filtered.sort((a, b) => a.distance - b.distance)
}
