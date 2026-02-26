# GitHub Copilot Instructions – Météo des Neiges

## Project Overview
This is a **static web application** that displays skiing resort weather information
for resorts in the Geneva region (Chamonix, Verbier, Zermatt, Megève, Les Gets,
Crans-Montana, Flaine, Saas-Fee).

It fetches live data from the **Open-Meteo API** (free, no API key required) and is
automatically deployed to **GitHub Pages** on every push to `main`.

## Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (CSS Grid, Custom Properties), ES2020 JavaScript (no framework)
- **API**: [Open-Meteo](https://open-meteo.com/) — `https://api.open-meteo.com/v1/forecast`
- **CI/CD**: GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`)
- **No build step** — everything is served as-is from the repository root

## File Structure
```
index.html          # Single-page entry point
css/style.css       # Responsive, mountain-themed stylesheet
js/app.js           # Weather fetching + dynamic card rendering
.github/
  workflows/
    deploy.yml      # GitHub Pages deployment workflow
  copilot-instructions.md
  agents/
    feature.md      # Instructions for feature-addition agents
    bugfix.md       # Instructions for bug-fix agents
    design.md       # Instructions for design/UX agents
```

## Coding Conventions
- **No frameworks** – plain vanilla JS; keep it lean
- **Security first**: use `textContent` / `setAttribute` (never `innerHTML`) for any dynamic data to prevent XSS
- **Strict mode**: all JS files start with `'use strict';`
- **CSP**: the `index.html` meta CSP header must be updated if new external domains are accessed
- **Accessibility**: use semantic HTML (`<article>`, `<header>`, `<main>`, `<footer>`), `aria-*` attributes, and `role` where needed
- **Responsive design**: CSS Grid with `auto-fill / minmax` — no media-query breakpoints for the grid itself; only for typography adjustments

## Adding a New Resort
1. Add an entry to the `RESORTS` array in `js/app.js`:
   ```js
   { name: 'ResortName', country: 'France|Suisse', lat: XX.XXXX, lon: Y.YYYY, altitude: ZZZZ }
   ```
2. No other changes required — the grid auto-adjusts.

## Adding a New Weather Variable
1. Add the Open-Meteo parameter name to `buildApiUrl()` (hourly or daily)
2. Parse it in `buildResortCard()` and render with the `el()` helper
3. Never use `innerHTML` — always `el()` or `textContent`

## Ski Rating Logic
The `computeRating(code, wind, snowCm)` function in `js/app.js` maps:
- Storm / rain → poor
- High wind (> 60 km/h) → fair
- Snowing + good snowpack (≥ 50 cm) → excellent
- Sunny + good snowpack → excellent
- Good snowpack (≥ 50 cm) → good
- Ok snowpack (≥ 20 cm) → fair
- Otherwise → poor

Adjust thresholds in `computeRating()` only, and keep the logic deterministic.

## Security Guidelines
- No API keys stored in source code
- Always use HTTPS endpoints
- `Content-Security-Policy` meta header is present — update `connect-src` if adding new API domains
- Never `eval()`, `new Function()`, or dynamic `<script>` injection
- All external links must use `rel="noopener noreferrer"`
