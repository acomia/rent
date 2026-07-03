/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Modern palette — confident violet brand on cool, high-contrast neutrals.
      // Token names kept stable across restyles; only the values move. `wine` =
      // the brand color, `champagne` = its lighter tint for dark-surface accents.
      colors: {
        wine: {
          DEFAULT: '#7C3AED', // violet-600 — primary brand
          deep: '#6D28D9', // violet-700 — pressed / dark bg
          soft: '#8B5CF6', // violet-500 — dark-mode fill
        },
        champagne: '#A78BFA', // violet-400 — links/accents on dark
        ink: '#0E0E11', // near-black text
        blush: '#FAFAFB', // cool canvas (light)
        plum: {
          950: '#0B0B0F', // canvas (dark)
          900: '#16161C', // surface (dark)
          800: '#1F1F27', // elevated (dark)
          700: '#2A2A34', // border (dark)
        },
        cream: '#F4F4F5', // text on dark
        muted: '#71717A', // secondary text (zinc-500)
      },
    },
  },
  plugins: [],
};
