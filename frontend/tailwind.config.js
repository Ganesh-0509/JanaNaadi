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
        indian: {
          saffron: '#FF9933',
          white: '#FFFFFF',
          green: '#138808',
          navy: '#001a4d',
          gold: '#D4AF37',
          teal: '#008B8B',
          rust: '#B7410E',
          deep: '#1a1a2e',
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulse3d: 'pulse3d 4s ease-in-out infinite',
        rotateSlow: 'rotateSlow 20s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        pulse3d: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.1)' },
        },
        rotateSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
