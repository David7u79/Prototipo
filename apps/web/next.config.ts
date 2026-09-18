import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Permite que la imagen final copie sólo el servidor y sus dependencias de ejecución.
  output: 'standalone',
  transpilePackages: ['@garfit/types', '@garfit/validation', '@garfit/api-client'],
};

export default nextConfig;
