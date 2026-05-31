/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#121212',
          card: '#1E1E1E',
          input: '#2A2A2A',
          border: '#333333',
        },
        neon: {
          DEFAULT: '#DEFF9A',
          hover: '#CDFA73',
          dim: '#B6E665',
        },
        muted: {
          DEFAULT: '#9CA3AF',
          dark: '#6B7280',
        },
        light: {
          DEFAULT: '#F3F4F6',
          white: '#FFFFFF',
        }
      },
    },
  },
  plugins: [],
}
