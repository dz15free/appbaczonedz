import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ألوان العلامة (قنوات RGB) — تدعم شفافية Tailwind
        primary: {
          DEFAULT: "rgb(var(--bz-primary) / <alpha-value>)",
          hover: "rgb(var(--bz-primary-hover) / <alpha-value>)",
        },
        secondary: "rgb(var(--bz-secondary) / <alpha-value>)",
        accent: "rgb(var(--bz-accent) / <alpha-value>)",
        danger: "rgb(var(--bz-danger) / <alpha-value>)",
        warning: "rgb(var(--bz-warning) / <alpha-value>)",
        // ألوان الثيم (تتغيّر بين الفاتح والداكن)
        // قنوات RGB + <alpha-value> — بدونها كان Tailwind يتجاهل bg-surface/80 بصمت
        surface: "rgb(var(--bz-surface-rgb) / <alpha-value>)",
        background: "rgb(var(--bz-bg-rgb) / <alpha-value>)",
        border: "rgb(var(--bz-border-rgb) / <alpha-value>)",
        "text-primary": "rgb(var(--bz-text-rgb) / <alpha-value>)",
        "text-muted": "rgb(var(--bz-text-muted-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-tajawal)", "system-ui", "sans-serif"],
        display: ["var(--font-cairo)", "var(--font-tajawal)", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31,38,135,0.08)",
        glow: "0 0 24px rgba(37,99,235,0.28)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #2563EB 0%, #0EA5E9 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.4,0,0.2,1) both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
