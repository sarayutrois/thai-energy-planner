import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        information: {
          DEFAULT: "hsl(var(--information))",
          foreground: "hsl(var(--information-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
        },
        chart: {
          primary: "hsl(var(--chart-primary))",
          secondary: "hsl(var(--chart-secondary))",
          grid: "hsl(var(--chart-grid))",
          solar: "hsl(var(--chart-solar))",
          peak: "hsl(var(--on-peak))",
          offPeak: "hsl(var(--off-peak))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
      },
      boxShadow: {
        panel:
          "0 1px 2px rgb(15 23 42 / 0.05), 0 16px 45px rgb(15 23 42 / 0.07)",
        float:
          "0 8px 20px rgb(15 23 42 / 0.08), 0 24px 70px rgb(15 23 42 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
