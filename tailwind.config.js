/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        sunken: v('sunken'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        copper: { DEFAULT: v('copper'), soft: v('copper-soft'), ink: v('copper-ink') },
        onCopper: v('on-copper'),
        danger: v('danger'),
        success: v('success'),
      },
      fontFamily: {
        sans: ['"Manrope Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Saira', '"Manrope Variable"', 'system-ui', 'sans-serif'],
      },
      opacity: { 8: '0.08', 12: '0.12', 88: '0.88', 92: '0.92' },
      borderRadius: { xl: '14px', '2xl': '18px', '3xl': '24px' },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.05), 0 1px 1px rgb(var(--shadow) / 0.03)',
        float: '0 8px 24px -6px rgb(var(--shadow) / 0.22), 0 2px 6px rgb(var(--shadow) / 0.08)',
        sheet: '0 -10px 40px -10px rgb(var(--shadow) / 0.25)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'sheet-in': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': { from: { opacity: 0, transform: 'scale(.96)' }, to: { opacity: 1, transform: 'none' } },
        // un segment de 40 % qui traverse la barre de bout en bout
        loading: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(250%)' } },
      },
      animation: {
        'fade-up': 'fade-up .28s cubic-bezier(.2,.8,.2,1) both',
        'sheet-in': 'sheet-in .32s cubic-bezier(.2,.9,.25,1) both',
        'fade-in': 'fade-in .2s ease both',
        'pop-in': 'pop-in .2s cubic-bezier(.2,.8,.2,1) both',
        loading: 'loading 1.1s cubic-bezier(.65,0,.35,1) infinite',
      },
    },
  },
  plugins: [],
}
