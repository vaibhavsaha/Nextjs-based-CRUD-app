/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { 
    unoptimized: true 
  },
  // Disable React strict mode to prevent hydration warnings
  reactStrictMode: false,
  // Configure static export
  trailingSlash: true,
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true
  },
  // Optimize font loading
  optimizeFonts: true
}

module.exports = nextConfig