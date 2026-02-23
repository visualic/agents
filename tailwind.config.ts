import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0F172A',
        surface: '#1E293B',
        elevated: '#334155',
        primary: '#6366F1',
        'primary-hover': '#818CF8',
        'text-primary': '#F8FAFC',
        'text-secondary': '#94A3B8',
        skill: '#8B5CF6',
        agent: '#06B6D4',
        orchestration: '#F97316',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      minWidth: {
        app: '1024px',
      },
      width: {
        sidebar: '240px',
      },
    },
  },
  plugins: [],
}

export default config
