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
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#E94057",
          light: "#FFF0F3",
          dark: "#D63050",
          50: "#FFF0F3",
          100: "#FFE0E6",
          200: "#FFC2CE",
          300: "#FF94A8",
          400: "#FF5C78",
          500: "#E94057",
          600: "#D63050",
          700: "#B91C3C",
        },
        card: "#FFFFFF",
        border: "#F0ECEC",
        muted: "#9CA3AF",
      },
      boxShadow: {
        card: "0 2px 16px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 4px 24px rgba(0, 0, 0, 0.10)",
        soft: "0 1px 8px rgba(0, 0, 0, 0.04)",
        action: "0 4px 20px rgba(233, 64, 87, 0.25)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
export default config;
