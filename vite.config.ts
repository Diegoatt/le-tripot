/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  base: './', // file:// in the packaged app
  plugins: [react(), tailwind()],
  server: { port: 5199, strictPort: true },
  test: { testTimeout: 120_000 },
});
