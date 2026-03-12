import type { Config } from "tailwindcss";

const config: Config = {
  // QUESTA È LA RIGA CHE SBLOCCA TUTTO:
  darkMode: "class", 
  
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Qui puoi aggiungere i tuoi colori personalizzati se vuoi
    },
  },
  plugins: [],
};
export default config;