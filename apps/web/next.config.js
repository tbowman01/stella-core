/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@arcqubit/shared',
    '@arcqubit/database',
    '@arcqubit/auth',
    '@arcqubit/documents',
    '@arcqubit/compliance',
    '@arcqubit/pqc',
    '@arcqubit/workspaces',
    '@arcqubit/search',
    '@arcqubit/ai',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*', // Proxy to backend API
      },
    ];
  },
};

module.exports = nextConfig;
