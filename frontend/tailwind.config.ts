import type { Config } from "tailwindcss";

// Tailwind design system configuration.
// This is where app-wide colors, typography, shadows, and animations are defined.
const config: Config = {
  // The app is dark-mode first and always renders with the `dark` class on <html>.
  darkMode: ["class"],
  // Tailwind scans these folders to find utility classes.
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./entities/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./layouts/**/*.{ts,tsx}",
    "./shared/**/*.{ts,tsx}",
    "./widgets/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      // Brand/application color tokens.
      // These make the UI feel like a realtime logistics terminal.
      colors: {
        terminal: {
          950: "#050B1A",
          900: "#071226",
          850: "#0A1020",
          800: "#0E1830",
          700: "#152341"
        },
        violet: {
          ops: "#8B5CF6",
          glow: "#A855F7"
        },
        cyan: {
          ops: "#22D3EE",
          deep: "#14B8A6"
        }
      },
      // System font stacks avoid external font downloads during local builds.
      fontFamily: {
        sans: ["Segoe UI", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Cascadia Code", "JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"]
      },
      // Subtle glow shadows for active navigation and live operational highlights.
      boxShadow: {
        glow: "0 0 28px rgba(139, 92, 246, 0.18)",
        cyan: "0 0 24px rgba(34, 211, 238, 0.16)"
      },
      // Lightweight animations used for realtime updates.
      keyframes: {
        rowPulse: {
          "0%": { backgroundColor: "rgba(34, 211, 238, 0.16)" },
          "100%": { backgroundColor: "transparent" }
        },
        liveDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.72)" }
        }
      },
      // Named animation utilities used in components.
      animation: {
        "row-pulse": "rowPulse 1100ms ease-out",
        "live-dot": "liveDot 1400ms ease-in-out infinite"
      }
    }
  },
  // No Tailwind plugins are required for this first version.
  plugins: []
};

export default config;
