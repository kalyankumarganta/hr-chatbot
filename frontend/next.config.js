/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true, // Ensure App Router is enabled
  },
  eslint: {
    ignoreDuringBuilds: true, // Optional: skip lint errors during deploy
  },
  compiler: {
    styledComponents: true, // Only if using styled-components
  },
};

module.exports = nextConfig;
