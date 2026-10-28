/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF6EF',
          200: '#F4ECE0',
          300: '#EADFD0',
        },
        ink: {
          DEFAULT: '#1E2630',
          800: '#28313C',
          700: '#3A444F',
          500: '#5C6670',
        },
        clay: {
          50: '#FBF1EC',
          100: '#F6E1D6',
          400: '#C86A43',
          500: '#B4552F',
          600: '#9A4526',
          700: '#7E381F',
        },
        gold: {
          400: '#C9A968',
          500: '#B9975B',
          600: '#9C7E48',
        },
        line: '#E6DACB',
        sand: '#EFE4D5',
        moss: {
          500: '#4F6B4F',
          600: '#3F573F',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        eyebrow: '0.18em',
      },
      maxWidth: {
        content: '76rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(30,38,48,0.04), 0 12px 32px -18px rgba(30,38,48,0.25)',
        lift: '0 2px 4px rgba(30,38,48,0.05), 0 24px 48px -24px rgba(30,38,48,0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
