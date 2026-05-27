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
          primary: "#0D0A08",
          secondary: "#14100C",
          card: "#1A1510",
          hover: "#252019",
          subtle: "#14100C",
        },
        accent: {
          DEFAULT: "#E32B45",
          hover: "#FF4D65",
          warm: "#F5B623",
          cherry: "#B91C3C",
        },
        text: {
          primary: "#FFF8F2",
          secondary: "#B8A89A",
          muted: "#6B5F55",
        },
        border: {
          DEFAULT: "rgba(245, 182, 67, 0.1)",
          light: "rgba(227, 43, 69, 0.2)",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        accent: "0 4px 28px rgba(227, 43, 69, 0.35)",
        "accent-lg": "0 8px 40px rgba(245, 182, 67, 0.2)",
        golden: "0 4px 32px rgba(245, 182, 67, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
