import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves this repo at /polyrhythm-metronome/, so the built
// asset URLs need that prefix. Override with BASE_PATH if you fork.
const base = process.env.BASE_PATH ?? "/polyrhythm-metronome/";

export default defineConfig({
	base,
	plugins: [react()],
});
