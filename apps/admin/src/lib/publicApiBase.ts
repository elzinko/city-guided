/**
 * Base URL of the Fastify API for browser calls (Render, etc.).
 * See apps/web-frontend/src/utils/publicApiBase.ts — keep logic in sync.
 */
export function normalizePublicApiBase(raw: string | undefined): string {
  let s = (raw ?? '').trim()
  if (!s) return ''
  s = s.replace(/\/+$/, '')
  if (s.endsWith('/api')) {
    s = s.slice(0, -4)
  }
  return s.replace(/\/+$/, '')
}
