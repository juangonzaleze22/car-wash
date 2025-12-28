/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class', // Enable dark mode using class strategy (synced with PrimeNG theme)
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  corePlugins: {
    preflight: false, // Disable Tailwind's base reset to preserve PrimeNG styles
  },
  plugins: [],
}
