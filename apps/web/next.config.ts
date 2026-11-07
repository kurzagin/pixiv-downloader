import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@krpkg/ui'],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.pximg.net',
      },
    ],
  },
};

export default nextConfig;
