/** @type {import('tailwindcss').Config} */
// Keep in sync with src/constants/colors.ts (palette from the HTML prototype).
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
          DEFAULT: '#2c52c4',
          dark: '#23429e',
          light: '#e3e9f8',
        },
        secondary: '#b5422e',
        success: '#2c8350',
        error: '#c03838',
        warning: '#b9800f',
        xp: '#6a3fc4',
        paper: '#eef1ea',
        surface: '#ffffff',
        'surface-elevated': '#ffffff',
        'app-text': '#1b211e',
        'text-secondary': '#5d6862',
        'text-tertiary': '#8a948e',
        'app-border': '#d3d9d0',
        'app-overlay': 'rgba(27,33,30,0.5)',
        'marker-found': '#2c8350',
        'marker-unfound': '#2c52c4',
        'search-circle': 'rgba(44,82,196,0.14)',
        'search-circle-border': 'rgba(44,82,196,0.4)',
      },
    },
  },
  plugins: [],
};
