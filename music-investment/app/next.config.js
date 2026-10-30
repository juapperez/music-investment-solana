/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  output: 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig
