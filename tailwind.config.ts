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
        saffron: "#FF9933",
        teal: "#008080",
        "deep-brown": "#3d2914",
        "off-white": "#f5f0e8",
        "road-tarmac": "#2a2520",
      },
    },
  },
  plugins: [],
};
export default config;
