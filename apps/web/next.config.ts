import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@garfit/types', '@garfit/validation', '@garfit/api-client'],
};

export default nextConfig;
