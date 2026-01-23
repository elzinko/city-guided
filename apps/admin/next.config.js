/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // If NEXT_PUBLIC_API_URL is set, don't use rewrites (staging/prod)
    if (process.env.NEXT_PUBLIC_API_URL) {
      return []
    }
    
    // For local dev, always use localhost
    // DOCKER_ENV must be exactly 'true' (string) to use Docker networking
    const isDocker = process.env.DOCKER_ENV === 'true'
    const apiHost = isDocker ? 'api' : 'localhost'
    const apiPort = process.env.API_PORT || '4000'
    
    console.log(`[next.config] API proxy: http://${apiHost}:${apiPort} (DOCKER_ENV=${process.env.DOCKER_ENV})`)
    
    return [
      {
        source: '/api/:path*',
        destination: `http://${apiHost}:${apiPort}/api/:path*`,
      },
    ]
  },
  // Autoriser les images externes (Wikidata Commons)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
      },
    ],
  },
}
module.exports = nextConfig
