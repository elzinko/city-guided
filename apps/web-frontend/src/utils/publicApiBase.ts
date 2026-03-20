/**
 * Base URL of the Fastify API for browser calls (Render, Vercel, etc.).
 *
 * Env is often either `https://api.example.com` or `https://site.example.com/api` (reverse proxy).
 * Our client code always appends `/api/...` paths, so strip a trailing `/api` to avoid `/api/api/...`.
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
