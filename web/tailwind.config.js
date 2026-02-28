/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f0fe',
          100: '#c8dfff',
          500: '#1a73e8',
          600: '#1557b0',
          700: '#0d47a1',
        },
        accent: {
          green: '#00c853',
          red: '#e53935',
          amber: '#f9a825',
          teal: '#00897b',
          purple: '#7b1fa2',
        },
      },
    },
  },
  plugins: [],
};
