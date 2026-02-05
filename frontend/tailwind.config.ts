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
        // 科技神秘風配色
        primary: {
          DEFAULT: "#00D4FF",
          50: "#E6FBFF",
          100: "#CCF7FF",
          200: "#99EFFF",
          300: "#66E7FF",
          400: "#33DFFF",
          500: "#00D4FF",
          600: "#00AACC",
          700: "#008099",
          800: "#005566",
          900: "#002B33",
        },
        secondary: {
          DEFAULT: "#7C3AED",
          50: "#F3EEFF",
          100: "#E7DDFF",
          200: "#CFBBFF",
          300: "#B799FF",
          400: "#9F77FF",
          500: "#7C3AED",
          600: "#6025C4",
          700: "#481C93",
          800: "#301262",
          900: "#180931",
        },
        background: "#0A0A0F",
        surface: "#1A1A2E",
        text: {
          DEFAULT: "#E4E4E7",
          muted: "#71717A",
        },
        accent: "#FF006E",
        border: "#27273A",
        // 額外霓虹色
        neon: {
          cyan: "#00D4FF",
          purple: "#7C3AED",
          pink: "#FF006E",
          green: "#00FF88",
        },
      },
      fontFamily: {
        heading: ["Inter", "Noto Sans TC", "sans-serif"],
        body: ["Inter", "Noto Sans TC", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 212, 255, 0.1)",
        medium: "0 4px 16px rgba(0, 212, 255, 0.15)",
        glow: "0 0 20px rgba(0, 212, 255, 0.3)",
        "glow-purple": "0 0 20px rgba(124, 58, 237, 0.3)",
        "glow-pink": "0 0 20px rgba(255, 0, 110, 0.3)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-cyber": "linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 50%, #0A0A0F 100%)",
        "gradient-neon": "linear-gradient(90deg, #00D4FF 0%, #7C3AED 50%, #FF006E 100%)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "gradient-shift": "gradient-shift 3s ease infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
