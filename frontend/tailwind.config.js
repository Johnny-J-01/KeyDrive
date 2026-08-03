/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0e1015',
        surface: '#15181e',
        primary: '#88a8ff', /* Soft blue accent matching the new image */
        textMain: '#e2e8f0',
        textMuted: '#94a3b8',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        borderMain: '#1e293b'
      },
      fontFamily: {
        mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
