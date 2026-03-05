/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── UFL-inspired dark palette ──
        surface: {
          DEFAULT: '#070b18',     // page background
          raised: '#0f1629',      // card background
          overlay: '#151b30',     // elevated overlays / modals
          hover: '#1a2240',       // hover state on cards
          border: '#1e2545',      // subtle card borders
          'border-strong': '#2a3158', // stronger borders
        },
        accent: {
          DEFAULT: '#7c3aed',     // primary violet
          hover: '#6d28d9',       // hover
          muted: 'rgba(124,58,237,0.15)', // soft background tint
          glow: 'rgba(124,58,237,0.35)',  // glow effect
        },
        success: {
          DEFAULT: '#10b981',
          muted: 'rgba(16,185,129,0.15)',
        },
        danger: {
          DEFAULT: '#ef4444',
          muted: 'rgba(239,68,68,0.12)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          muted: 'rgba(245,158,11,0.12)',
        },
        txt: {
          primary: '#f1f5f9',     // white-ish
          secondary: '#94a3b8',   // gray-400
          muted: '#64748b',       // gray-500
          dim: '#475569',         // gray-600
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        glow: '0 0 20px rgba(124,58,237,0.25)',
        'glow-sm': '0 0 10px rgba(124,58,237,0.2)',
        card: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(30,37,69,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30,37,69,0.5) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
