// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // URL pública: canonical y og:image necesitan rutas absolutas.
  site: process.env.PUBLIC_SITE_URL ?? 'https://garfit.da-bit.cloud',
  vite: {
    plugins: [tailwindcss()],
  },
});
