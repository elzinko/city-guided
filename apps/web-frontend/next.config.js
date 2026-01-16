/** @type {import('next').NextConfig} */
const devProxy = process.env.NEXT_PUBLIC_API_URL
  ? []
  : [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ]

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return devProxy
  },
}
module.exports = nextConfig
