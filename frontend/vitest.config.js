// vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // Explicitly forces jsdom for all test files
    globals: true,        // Allows cleanup and DOM globals to bind cleanly
  },
});


