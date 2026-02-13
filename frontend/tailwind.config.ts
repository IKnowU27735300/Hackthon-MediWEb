import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fbf5e9',
          100: '#f6ebcd',
          200: '#edd69b',
          300: '#e3c269',
          400: '#daad37',
          500: '#d4af37', // Core Gold
          600: '#c5a021',
          700: '#a3831b',
          800: '#826a33',
          900: '#6a562a',
          950: '#3d3118',
        },
        accent: {
          gold: '#d4af37',
          champagne: '#fbf5e9',
          bronze: '#826a33',
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
