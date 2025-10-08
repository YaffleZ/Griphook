import type { NextConfig } from "next";

const isElectron = process.env.BUILD_TARGET === 'electron';

const nextConfig: NextConfig = {
  // Dynamic output based on build target
  output: isElectron ? 'export' : 'standalone',
  
  // Base path for static export in Electron
  ...(isElectron && {
    basePath: '',
    assetPrefix: '',
    trailingSlash: true,
    images: {
      unoptimized: true
    },
    // Exclude API routes for static export
    async rewrites() {
      return {
        beforeFiles: [],
        afterFiles: [],
        fallback: []
      };
    }
  }),
  
  // Development and production optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
