/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif']
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL ,
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads'
  }
};

module.exports = nextConfig;