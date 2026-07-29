import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this repo at /polyrythm-metronome/, so the built
// asset URLs need that prefix. Override with BASE_PATH if you fork.
const base = process.env.BASE_PATH ?? "/polyrythm-metronome/";

export default defineConfig({
  base,
  plugins: [react()],
});
