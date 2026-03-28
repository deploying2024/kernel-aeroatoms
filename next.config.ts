import type { NextConfig } from 'next'
const withPWA = require('next-pwa')({
  dest            : 'public',
  register        : true,
  skipWaiting     : true,
  disable         : process.env.NODE_ENV === 'development',
  buildExcludes   : [/middleware-manifest\.json$/],
})

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = withPWA(nextConfig)