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
          DEFAULT: '#b5422e',
          dark: '#93351f',
          light: '#f3e4df',
        },
        secondary: '#2c52c4',
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
        'marker-unfound': '#b5422e',
        'search-circle': 'rgba(181,66,46,0.14)',
        'search-circle-border': 'rgba(181,66,46,0.45)',
      },
    },
  },
  plugins: [],
};
