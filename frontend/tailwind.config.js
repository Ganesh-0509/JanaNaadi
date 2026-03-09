/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sentiment: {
          positive: '#22C55E',
          neutral: '#EAB308',
          negative: '#EF4444',
          critical: '#DC2626',
        },
      },
    },
  },
  plugins: [],
};
