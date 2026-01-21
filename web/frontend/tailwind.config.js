/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom colors that complement the CSS variables
      // These are used for Tailwind utility classes like bg-emerald, text-gold, etc.
      colors: {
        emerald: {
          DEFAULT: '#10b981',
          light: '#34d399',
          muted: '#065f46',
        },
        gold: {
          DEFAULT: '#d4a44a',
          muted: '#92702f',
        },
        coral: {
          DEFAULT: '#f87171',
          muted: '#991b1b',
        },
        purple: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
        },
        indigo: {
          DEFAULT: '#6366f1',
        },
      },
      // Font family matching the CSS
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Source Sans 3', 'system-ui', 'sans-serif'],
      },
      // Animation timing functions
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
