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
          DEFAULT: "#FE828C",
          light: "#FFF0F1",
          dark: "#FE616E",
          50: "#FFF0F1",
          100: "#FFDDE0",
          200: "#FFBEC2",
          300: "#FF9AA1",
          400: "#FEA0A7",
          500: "#FE828C",
          600: "#FE616E",
          700: "#FE4050",
        },
        card: "#FFFFFF",
        border: "#F0ECEC",
        muted: "#9CA3AF",
      },
      boxShadow: {
        card: "0 2px 16px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 4px 24px rgba(0, 0, 0, 0.10)",
        soft: "0 1px 8px rgba(0, 0, 0, 0.04)",
        action: "0 4px 20px rgba(254, 130, 140, 0.25)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
export default config;
