import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#0E1113",
          panel: "#161A1D",
          border: "#262B2F",
          steel: "#5B8DBE",
          steelBright: "#7FB2E0",
          text: "#E7E9EA",
          muted: "#8A9096",
          danger: "#C4634F",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        dial: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        unlock: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        dial: "dial 1.2s cubic-bezier(0.6,0,0.4,1)",
        unlock: "unlock 0.35s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
