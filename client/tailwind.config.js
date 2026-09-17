import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [
    daisyui
  ],
  daisyui: {
    themes: ["dark", "light", "cupcake", "dracula", "nord", "synthwave", "night"],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
  }
};
