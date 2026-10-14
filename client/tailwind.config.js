/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tmc: {
          navy: {
            DEFAULT: '#0F1E36',
            50: '#F0F4FA',
            100: '#DDE5F2',
            200: '#B8CBE5',
            300: '#8DAACF',
            400: '#5F85B5',
            500: '#3D659B',
            600: '#2A4A77',
            700: '#1D3559',
            800: '#13243F',
            900: '#0B1626',
          },
          gold: {
            DEFAULT: '#C59A3F',
            light: '#DFB864',
            dark: '#9E7728',
          },
          military: {
            red: '#BD1E24',
            green: '#1E6F38',
            amber: '#D97706',
            gray: '#4B5563',
          }
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'IBM Plex Sans Arabic', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
