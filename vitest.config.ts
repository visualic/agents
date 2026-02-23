import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/helpers/setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx}',
      'electron/**/*.test.ts',
      'tests/**/*.test.ts'
    ]
  }
})
