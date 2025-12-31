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
