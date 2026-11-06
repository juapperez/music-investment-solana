/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_REFUND_PREVIEW === 'local'
    ? '.next-refund-preview' : '.next',
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
