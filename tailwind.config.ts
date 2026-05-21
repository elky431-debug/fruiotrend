import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0A0A0A",
          secondary: "#111111",
          card: "#1A1A1A",
          hover: "#222222",
          subtle: "#0D0D0D",
        },
        accent: {
          DEFAULT: "#C8FF00",
          hover: "#B8EF00",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#888888",
          muted: "#555555",
        },
        border: {
          DEFAULT: "#2A2A2A",
          light: "#333333",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
