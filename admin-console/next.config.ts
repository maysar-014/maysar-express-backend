import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Config for admin-console
  output: 'standalone',
  experimental: {
    turbo: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;
