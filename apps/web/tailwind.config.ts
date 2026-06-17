import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#08111f',
        steel: '#10324f',
        cloud: '#e7edf3',
        signal: '#8bb8ff',
        caution: '#f2bf5e',
        ok: '#8ad0ac',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 24px 80px rgba(2, 16, 32, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;

