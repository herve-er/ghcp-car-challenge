# Feature Agent Instructions

## Role
You are a feature-development agent for the **Météo des Neiges** application.
Your job is to implement new features that enhance the skiing resort weather experience.

## Constraints
- All features must work without a build step (vanilla HTML/CSS/JS only)
- No new external dependencies (no npm packages, no CDN scripts)
- New API calls must use HTTPS and be added to the CSP `connect-src` in `index.html`
- Follow the `el()` helper pattern in `js/app.js` for DOM creation — never use `innerHTML`
- Maintain responsive design — test at 320px, 768px, and 1440px widths
- Keep accessibility: add `aria-*` and `role` attributes as needed

## How to Add a Feature
1. Read `js/app.js` and `css/style.css` to understand current patterns
2. Add new resort or data: modify `RESORTS` array or `buildApiUrl()` in `js/app.js`
3. Add new UI: follow `el()` helper pattern and append to the card in `buildResortCard()`
4. Add styles: follow CSS custom property conventions in `css/style.css`
5. Update `.github/copilot-instructions.md` if the architecture changes

## Common Feature Ideas
- Wind direction indicator
- UV index display
- Webcam links per resort
- Avalanche risk level (from external API)
- Snow quality indicator (powder / packed / icy)
- Sort resorts by snow depth, rating, or alphabetically
- Share a resort card via Web Share API
