/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'inter-thai': ['Inter Thai Looped', 'system-ui', 'sans-serif'],
        'sans': ['Inter Thai Looped', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
