import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@kurzagin/ui'],
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
