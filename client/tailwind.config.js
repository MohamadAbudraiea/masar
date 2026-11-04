/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#071E33',
          800: '#0C2B47',
          700: '#143B5E',
          100: '#E3EBF3',
        },
        amber: {
          500: '#F5A82A',
          600: '#E39413',
          100: '#FDF0D5',
        },
        surface: '#F4F7FA',
        card: '#FFFFFF',
        line: '#DDE5EC',
        ink: {
          DEFAULT: '#0F1B2A',
          muted: '#4A5B6D',
        },
        status: {
          requested: '#475569',
          'requested-bg': '#E7ECF1',
          pending: '#8A5A00',
          'pending-bg': '#FDF0D5',
          waiting: '#1D4ED8',
          'waiting-bg': '#DBEAFE',
          delivery: '#0F766E',
          'delivery-bg': '#CCFBF1',
          delivered: '#6D28D9',
          'delivered-bg': '#EDE9FE',
          audited: '#15803D',
          'audited-bg': '#DCFCE7',
          danger: '#B91C1C',
          'danger-bg': '#FEE2E2',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

