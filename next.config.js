/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint configuration - ignore linting in production
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  
  // TypeScript configuration - ignore type checking errors in production builds
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },

  // Production optimizations
  poweredByHeader: false,
  compress: true,
  
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'your-production-domain.com']
    },
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  },
  
  images: {
    domains: ['localhost', 'res.cloudinary.com', 'dtxrncjfs.cloudinary.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Production optimizations
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': './src',
      };
    }
    
    return config;
  },
  
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads'
  },
  
  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
  
  // Output configuration for production builds
  output: 'standalone',
  
  // Disable source maps in production for security
  productionBrowserSourceMaps: false,
  
  // Optimize bundle analyzer
  bundlePagesRouterDependencies: true,
  
  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/dashboard',
        permanent: true,
      },
      // Add favicon redirect to use logo.png
      {
        source: '/favicon.ico',
        destination: '/logo.png',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;