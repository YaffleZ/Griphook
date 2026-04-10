import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone for Docker deployment
  output: 'standalone',

  // Keep undici external so Next.js doesn't bundle it — needed for instrumentation.ts
  // to patch undici's global dispatcher for corporate TLS trust
  serverExternalPackages: ['undici'],

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
