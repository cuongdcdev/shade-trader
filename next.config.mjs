/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // This is for client-side components
  output: 'standalone',
};

export default nextConfig;
