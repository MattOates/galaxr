import { defineConfig } from 'vite';

export default defineConfig({
  // When VITE_BASE is set (by CI/GitHub Pages), use that path.
  // Falls back to '/' for local dev.
  base: process.env.VITE_BASE || '/',

  test: {
    // Pure logic tests run in Node — no browser APIs needed
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
