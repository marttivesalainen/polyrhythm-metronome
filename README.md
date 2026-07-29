# Polyrhythm Metronome

A polyrhythm trainer built with React + Vite. Left and right hands play against
each other over a shared grid; the background beat marks every cell.

Live: https://marttivesalainen.github.io/polyrhythm-metronome/

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Pushes to `main` are built and published to GitHub Pages by
`.github/workflows/deploy.yml`. Enable Pages once in the repo settings
(**Settings → Pages → Build and deployment → Source: GitHub Actions**).

If you fork under a different repo name, override the base path at build time:

```bash
BASE_PATH=/your-repo-name/ npm run build
```
