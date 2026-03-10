import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Enable React Compiler for automatic optimizations
  experimental: {
    reactCompiler: true,
    optimizePackageImports: [
      '@phosphor-icons/react',
      'sonner',
      'recharts',
      '@supabase/supabase-js',
    ],
  },

  // Advanced bundle splitting for streamlined TADA VTU
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev && !isServer) {
      // Optimized splitting for core mobile services only
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 6, // Reduced for faster initial load
        maxAsyncRequests: 8,   // Optimized for mobile
        cacheGroups: {
          // Core React (highest priority)
          react: {
            name: 'react',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            priority: 50,
            enforce: true,
          },
          // Supabase client (essential for auth/data)
          supabase: {
            name: 'supabase',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            priority: 45,
            enforce: true,
          },
          // Core UI components (icons, notifications)
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@phosphor-icons|sonner|@radix-ui)[\\/]/,
            priority: 40,
          },
          // QR code generation (Data Vault feature)
          qr: {
            name: 'qr',
            chunks: 'async', // Load only when needed
            test: /[\\/]node_modules[\\/](qrcode)[\\/]/,
            priority: 35,
          },
          // PDF generation (receipts)
          pdf: {
            name: 'pdf',
            chunks: 'async', // Load only when needed
            test: /[\\/]node_modules[\\/](jspdf)[\\/]/,
            priority: 30,
          },
          // Other vendor libraries (minimal)
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
            minChunks: 2,
            maxSize: 200000, // Keep vendor chunks small
          },
        },
      };

      // Aggressive tree shaking for streamlined app
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      config.optimization.innerGraph = true;
      
      // Module concatenation for smaller bundles
      config.optimization.concatenateModules = true;
    }

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tadavtu.com',
      },
      {
        protocol: 'https',
        hostname: 'www.tadavtu.com',
      },
    ],
  },
  // Cache headers for static assets
  async headers() {
    return [
      {
        // Cache static assets for 1 year
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|woff|woff2|ttf|otf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache JS/CSS for 1 year (they have hashes in filenames)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache service worker with short TTL for updates
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Cache pages for 1 hour, revalidate in background
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
