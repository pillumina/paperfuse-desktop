/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Modern Flat Design System - Poppins + Open Sans
      fontFamily: {
        sans: ['Poppins', 'Open Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      // Border Radius - Unified to 12px (rounded-xl) for cards
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '8px',
      },

      // Extended Color Palette - Modern Flat Style
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          950: '#022C22',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          950: '#451A03',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#450A0A',
        },
      },

      // Spacing - 8px grid system
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
        '13': '52px',
        '15': '60px',
        '17': '68px',
        '18': '72px',
        '19': '76px',
        '21': '84px',
      },

      // Box Shadow - Modern Flat (minimal shadows)
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        'input': '0 1px 2px rgba(0,0,0,0.05)',
        'input-focus': '0 0 0 3px rgba(59, 130, 246, 0.1)',
      },

      // Animation duration - 150-200ms for micro-interactions
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
      },

      // Custom animations
      keyframes: {
        'slide-in-top': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in-top': 'slide-in-top 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
