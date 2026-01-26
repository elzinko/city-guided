/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix HMR issues with file watching
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
        ignored: ['**/node_modules/**', '**/.git/**'],
      }
    }
    return config
  },
  async rewrites() {
    // If NEXT_PUBLIC_API_URL is set, don't use rewrites (client-side will use the env var)
    // Otherwise, use server-side rewrites to proxy API calls
    if (process.env.NEXT_PUBLIC_API_URL) {
      return []
    }
    
    // In Docker, use 'api' service name; otherwise use localhost
    const apiHost = process.env.DOCKER_ENV ? 'api' : 'localhost'
    const apiPort = process.env.API_PORT || '4000'
    
    return [
      {
        source: '/api/:path*',
        destination: `http://${apiHost}:${apiPort}/api/:path*`,
      },
    ]
  },
}
module.exports = nextConfig
