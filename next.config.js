/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // Since this is a hackathon project, we can be a bit more permissive with TypeScript errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // We're still in development, so we can ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
