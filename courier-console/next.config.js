/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  swcMinify: false,
  compiler: {
    removeConsole: false,
  },
}

module.exports = nextConfig