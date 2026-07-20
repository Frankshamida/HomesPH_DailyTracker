import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ---- Semantic tokens (CSS variables, theme-aware) ----
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          // keep the numeric gold ramp for existing usages
          50: "#fff8ec",
          100: "#ffedcc",
          200: "#ffd894",
          300: "#ffbf57",
          400: "#ffa726",
          500: "#f59300",
          600: "#d97400",
          700: "#b45509",
          800: "#92430e",
          900: "#78380f",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // ---- Homes.ph royal blue ramp (kept for existing classes) ----
        brand: {
          50: "#eef2ff",
          100: "#dfe6ff",
          200: "#c4d0ff",
          300: "#9fb0ff",
          400: "#7385ff",
          500: "#4f5cf6",
          600: "#3a3fe8",
          700: "#2b2fcc",
          800: "#232aa6",
          900: "#1e2a8c",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 hsl(222 47% 11% / 0.04)",
        sm: "0 1px 3px 0 hsl(222 47% 11% / 0.06), 0 1px 2px -1px hsl(222 47% 11% / 0.06)",
        md: "0 4px 12px -2px hsl(222 47% 11% / 0.08), 0 2px 6px -2px hsl(222 47% 11% / 0.06)",
        lg: "0 12px 28px -8px hsl(222 47% 11% / 0.12), 0 4px 10px -4px hsl(222 47% 11% / 0.08)",
        xl: "0 24px 48px -12px hsl(222 47% 11% / 0.18)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "scale-in": "scale-in 180ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
