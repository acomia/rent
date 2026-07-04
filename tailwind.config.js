/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Pastel rental identity — a confident grape brand over four soft accents
      // (purple/pink/blue/yellow), on clean neutrals. Token names stay stable
      // across restyles; only the values move.
      colors: {
        grape: {
          DEFAULT: '#8165CA', // primary brand — buttons, active toggle, links
          deep: '#6B4FB0', // pressed
          soft: '#9B85D6', // dark-mode brand fill
        },
        bubblegum: '#ED5C9D', // secondary accent — price, hearts, badges
        sky: '#D2EDF6', // pastel surface (tiles)
        butter: '#FDF1AA', // pastel surface (tiles)
        lilac: '#EDE7FA', // purple-tint card
        blush: '#FCE0EC', // pink-tint card
        ink: '#1A1523', // primary text — warm near-black
        canvas: {
          DEFAULT: '#FFFFFF', // page bg (light)
          subtle: '#F7F6FB', // alt page bg (light)
        },
        muted: '#6E6A7D', // secondary text — meets WCAG AA (4.5:1) on white
        // Dark surfaces.
        night: {
          950: '#14121A', // canvas
          900: '#1E1B26', // surface
          800: '#29252F', // elevated
          700: '#38333F', // border
        },
        cloud: '#F5F3F8', // text on dark
      },
      // Poppins as a free Gilroy stand-in. React Native does NOT synthesize
      // weights for runtime-loaded fonts, so each weight is its own family and
      // gets its own utility (font-sans, font-sans-medium, …). Use these instead
      // of Tailwind's font-weight utilities.
      fontFamily: {
        sans: ['Poppins_400Regular'],
        'sans-medium': ['Poppins_500Medium'],
        'sans-semibold': ['Poppins_600SemiBold'],
        'sans-bold': ['Poppins_700Bold'],
        'sans-extrabold': ['Poppins_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
