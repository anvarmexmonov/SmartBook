/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F7F3EA',
        paper: '#FCFAF5',
        ink: '#1F1D1A',
        soft: '#46423B',
        muted: '#77705F',
        line: '#E4DDCD',
        rule: '#D3CAB5',
        forest: { DEFAULT: '#23432F', 600: '#2E5640', 100: '#E3EBE3', 50: '#F0F4EF' },
        wine: { DEFAULT: '#7A2431', 100: '#F3E3E2', 50: '#F9F0EE' },
        ochre: { DEFAULT: '#9A6B21', 100: '#F4EAD5' },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', '"Source Serif Pro"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        book: '0 1px 1px rgba(30,25,15,.08), 0 6px 12px -4px rgba(30,25,15,.18), 0 18px 30px -12px rgba(30,25,15,.28)',
        'book-hover': '0 2px 2px rgba(30,25,15,.08), 0 10px 18px -6px rgba(30,25,15,.22), 0 28px 40px -16px rgba(30,25,15,.34)',
        panel: '0 1px 2px rgba(30,25,15,.05), 0 8px 24px -12px rgba(30,25,15,.18)',
      },
      maxWidth: { measure: '40rem' },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { transform: 'translateX(16px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
        pulseDot: { '0%,80%,100%': { opacity: 0.25 }, '40%': { opacity: 1 } },
      },
      animation: {
        fadeUp: 'fadeUp .35s ease-out both',
        fadeIn: 'fadeIn .25s ease-out both',
        slideIn: 'slideIn .3s ease-out both',
        pulseDot: 'pulseDot 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}
