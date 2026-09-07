/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Editorial rental identity (see DESIGN.md): a warm ivory ground, an
      // antique-bronze primary action, and a warm-charcoal action for the
      // highest-commitment step. Bronze proposes; charcoal commits.
      //
      // Photography is the only saturated colour in the app — no decorative
      // tints. Status colour is never decorative, and no decorative surface
      // borrows a status hue.
      //
      // Token names stay stable across restyles; only the values move.
      colors: {
        // Grounds and text.
        canvas: {
          DEFAULT: '#F7F3EC', // page ground — warm ivory, never white
          subtle: '#EDE7DC', // recessed fills: inputs, chips at rest, skeletons
        },
        surface: '#FFFDF9', // raised cards and sheets
        hairline: '#E5DDD0', // separates without outlining
        ink: '#1C1A17', // primary text — warm near-black
        muted: '#6F675B', // secondary text — AA (5.1:1) on canvas
        // Actions.
        bronze: {
          DEFAULT: '#8A6F45', // primary action — AA (4.7:1) with white labels
          deep: '#6F5836', // pressed
          soft: '#E8DCC8', // secondary fill, rental-band tint
        },
        charcoal: '#1C1A17', // commit action: Check dates, selected size/date
        // Status. Each is a pale fill plus an ink that passes AA on canvas.
        // One meaning each, everywhere in the app.
        pending: { DEFAULT: '#8A6114', soft: '#F7E9CE' },
        confirmed: { DEFAULT: '#1F7A45', soft: '#DCEEE0' },
        outnow: { DEFAULT: '#A2551F', soft: '#FAE3D2' },
        cleaning: { DEFAULT: '#2A6389', soft: '#D9E7F2' },
        overdue: { DEFAULT: '#A83232', soft: '#F8DDDD' },
        settled: { DEFAULT: '#6F675B', soft: '#EAE6DE' },
        // Dark surfaces. The board is light-only; dark stays warm rather than
        // inverting to blue-black, so the identity survives at night.
        night: {
          950: '#14120F', // canvas
          900: '#1E1B16', // surface
          800: '#2A251E', // elevated
          700: '#3A342A', // border
        },
        cloud: '#F2EDE4', // text on dark
        'muted-dark': '#A79E90', // secondary text on dark — AA (6.5:1) on night-900
      },
      // Two roles. Playfair Display carries the moments that matter (wordmark,
      // screen titles, item names, the one big number); Inter does every label,
      // row, button and sentence and should disappear.
      //
      // React Native does NOT synthesize weights for runtime-loaded fonts, so
      // each weight is its own family with its own utility. Use these instead
      // of Tailwind's font-weight utilities.
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
        display: ['PlayfairDisplay_400Regular'],
        'display-medium': ['PlayfairDisplay_500Medium'],
        'display-semibold': ['PlayfairDisplay_600SemiBold'],
        'display-bold': ['PlayfairDisplay_700Bold'],
      },
    },
  },
  plugins: [],
};
