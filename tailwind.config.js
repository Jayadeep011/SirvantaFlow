/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#070708',
        surface: { base: '#0E0E11', elevated: '#15151A' },
        gold: { DEFAULT: '#E2B13C', light: '#F3D27C', neon: '#FFD666' },
        emerald: { telemetry: '#10B981' },
      },
      fontFamily: {
        display: ['"Instrument Serif"', '"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        depth: '0 20px 50px -10px rgba(0, 0, 0, 0.85), 0 0 30px rgba(226, 177, 60, 0.03)',
        'gold-glow': '0 0 24px -6px rgba(226, 177, 60, 0.65)',
      },
    },
  },
  plugins: [],
};
