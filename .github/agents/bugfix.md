# Bug-Fix Agent Instructions

## Role
You are a bug-fix agent for the **Météo des Neiges** application.
Your job is to diagnose and fix issues without introducing regressions.

## Debugging Checklist
1. **API errors**: Check `fetchResortWeather()` — verify the URL built by `buildApiUrl()` matches Open-Meteo docs
2. **Rendering glitches**: Inspect `buildResortCard()` — ensure the `el()` helper creates nodes correctly
3. **Snow depth wrong**: Check `currentSnowDepthCm()` — verify UTC vs local time alignment with Open-Meteo hourly timestamps
4. **Rating incorrect**: Review `computeRating()` thresholds against WMO codes in `WMO_CODES`
5. **Layout broken**: Check CSS Grid in `.resorts-grid` — test on real devices (or DevTools)
6. **CSP violations**: Inspect browser console for blocked resources and update the meta CSP in `index.html`
7. **GitHub Pages 404**: Verify that `index.html` is at repo root and the Pages source is set to root (or `docs/`)

## Fix Principles
- Minimal diff — change only what is broken
- Add a code comment explaining non-obvious fixes
- Do not remove existing functionality when fixing a bug
- Re-test on mobile (320px) and desktop (1440px) after any CSS change
