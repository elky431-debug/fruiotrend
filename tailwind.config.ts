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
          primary: "#0A0806",
          secondary: "#12100D",
          card: "#1A1612",
          hover: "#262018",
          subtle: "#14100C",
        },
        accent: {
          DEFAULT: "#E32B45",
          hover: "#FF5C7A",
          warm: "#FF5C9D",
          pink: "#FF5C9D",
          cherry: "#B91C3C",
          soft: "#FF8FBF",
        },
        text: {
          primary: "#FFF8F2",
          secondary: "#C4B5A8",
          muted: "#7A6F64",
        },
        border: {
          DEFAULT: "rgba(255, 92, 157, 0.14)",
          light: "rgba(227, 43, 69, 0.35)",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
