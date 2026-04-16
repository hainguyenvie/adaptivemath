/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bfd2ff',
          300: '#93b4ff',
          400: '#608aff',
          500: '#3b63ff',
          600: '#2440f5',
          700: '#1c32d4',
          800: '#1a2caa',
          900: '#1b2c86',
        },
      },
    },
  },
  plugins: [],
}
