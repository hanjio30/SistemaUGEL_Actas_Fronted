// astro.config.mjs
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  integrations: [preact()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
});