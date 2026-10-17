import { defineConfig } from 'vitest/config';

// GitHub Pages 프로젝트 사이트 경로(https://<owner>.github.io/historygame/)
export default defineConfig({
  base: process.env.VITE_BASE ?? '/historygame/',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
