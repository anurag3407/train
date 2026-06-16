/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070912",
          900: "#0d111c",
          850: "#121726",
          800: "#171d31",
          700: "#21283e",
          600: "#2c3550",
          500: "#3d4866",
          400: "#5b6884",
          300: "#8d97ae",
          200: "#c3c9d7",
          100: "#e6ebf5",
        },
        accent: {
          400: "#5cf2c2",
          500: "#22d4a4",
          600: "#0fb289",
        },
        plasma: {
          400: "#a78bfa",
          500: "#7c5cff",
          600: "#5b3ddb",
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
        display: ['"Instrument Serif"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.06em',
        tighter: '-0.04em',
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(34, 212, 164, 0.55)",
        plasma: "0 0 60px -10px rgba(124, 92, 255, 0.55)",
        soft: "0 30px 80px -20px rgba(0,0,0,0.55)",
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
        snappy: 'cubic-bezier(0.4, 0, 0.2, 1.6)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        gridpulse: {
          '0%,100%': { opacity: 0.18 },
          '50%':     { opacity: 0.32 },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        marquee: 'marquee 40s linear infinite',
        gridpulse: 'gridpulse 8s ease-in-out infinite',
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        'grid': "linear-gradient(to right, rgba(141,151,174,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(141,151,174,0.07) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
