/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#208AEF',
          dark: '#1A6FBF',
          light: '#E6F4FE',
        },
        secondary: '#FF6B35',
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
        surface: '#F8FAFC',
        'surface-elevated': '#FFFFFF',
        'app-text': '#0F172A',
        'text-secondary': '#64748B',
        'text-tertiary': '#94A3B8',
        'app-border': '#E2E8F0',
        'app-overlay': 'rgba(0,0,0,0.5)',
        'marker-found': '#22C55E',
        'marker-unfound': '#208AEF',
        'search-circle': 'rgba(32,138,239,0.15)',
        'search-circle-border': 'rgba(32,138,239,0.4)',
      },
    },
  },
  plugins: [],
};
