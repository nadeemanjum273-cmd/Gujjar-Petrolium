/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a1128',
          900: '#101d42',
          850: '#152554',
          800: '#1c3166',
          700: '#28468f',
          600: '#385eb5',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
      },
      fontFamily: {
        urdu: ['Noto Sans Arabic', 'Tahoma', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
