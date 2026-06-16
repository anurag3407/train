/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0d14",
          900: "#101521",
          800: "#161c2c",
          700: "#1f2638",
          600: "#2a3349",
          500: "#3a455e",
          400: "#5b6884",
          300: "#8d97ae",
          200: "#c3c9d7",
        },
        accent: {
          400: "#5cf2c2",
          500: "#22d4a4",
          600: "#0fb289",
        },
        warn: {
          400: "#ffb347",
          500: "#ff8a3c",
          600: "#ff6a1f",
        },
        danger: {
          400: "#ff7676",
          500: "#ff3d3d",
          600: "#d62020",
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(34, 212, 164, 0.45)",
      },
    },
  },
  plugins: [],
};
