/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        navy:   { DEFAULT: '#1B3A6B', 50: '#EAF0FB', 100: '#C9D8F4', 200: '#93B0E9', 300: '#5D88DE', 400: '#3360C9', 500: '#1B3A6B', 600: '#162F57', 700: '#102243', 800: '#0B162F', 900: '#050B18' },
        teal:   { DEFAULT: '#0E7C7B', 50: '#E5F4F4', 100: '#B8E3E3', 200: '#70C6C5', 300: '#29A9A8', 400: '#0E7C7B', 500: '#0B6463', 600: '#094D4C', 700: '#063636', 800: '#042020', 900: '#020A0A' },
        brand:  { DEFAULT: '#2D9CDB', light: '#56B4E8', dark: '#1E7BB5' },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
