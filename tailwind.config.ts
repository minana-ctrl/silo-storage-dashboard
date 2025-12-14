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
        primary: {
          DEFAULT: "#ec2f2f",
          red: "#ec2f2f",
        },
        secondary: {
          DEFAULT: "#000000",
          black: "#000000",
        },
        background: {
          DEFAULT: "#ffffff",
          white: "#ffffff",
        },
        text: {
          DEFAULT: "#333333",
          dark: "#333333",
          muted: "#9ca3af",
        },
        border: {
          DEFAULT: "#e5e5e5",
        },
      },
      fontFamily: {
        heading: ["var(--font-robostic)", "sans-serif"],
        body: ["var(--font-metropolis)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};
export default config;







