import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          hover: "var(--bg-hover)",
          active: "var(--bg-active)",
        },
        border: {
          subtle: "var(--border-subtle)",
          default: "var(--border-default)",
          strong: "var(--border-strong)",
        },
        fg: {
          primary: "var(--fg-primary)",
          secondary: "var(--fg-secondary)",
          muted: "var(--fg-muted)",
          faint: "var(--fg-faint)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          muted: "var(--accent-muted)",
          border: "var(--accent-border)",
        },
        blue: {
          DEFAULT: "var(--blue)",
          muted: "var(--blue-muted)",
        },
        green: {
          DEFAULT: "var(--green)",
          muted: "var(--green-muted)",
        },
        purple: {
          DEFAULT: "var(--purple)",
          muted: "var(--purple-muted)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          muted: "var(--amber-muted)",
        },
        red: {
          DEFAULT: "var(--red)",
          muted: "var(--red-muted)",
        },
        cyan: {
          DEFAULT: "var(--cyan)",
          muted: "var(--cyan-muted)",
        },
        pink: {
          DEFAULT: "var(--pink)",
          muted: "var(--pink-muted)",
        },
        teal: {
          DEFAULT: "var(--teal)",
          muted: "var(--teal-muted)",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
        slow: "300ms",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--glow-accent)",
        "glow-blue": "var(--glow-blue)",
        "glow-green": "var(--glow-green)",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-surface": "var(--gradient-surface)",
        "gradient-card": "var(--gradient-card)",
      },
    },
  },
  plugins: [],
};

export default config;
