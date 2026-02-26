# ⛷️ Météo des Neiges – Alpes Genevoises

A static web application that displays live skiing resort weather for resorts in the Geneva region (Chamonix, Verbier, Zermatt, Megève, Les Gets, Crans-Montana, Flaine, Saas-Fee).

## Features

- 🌤️ **Live weather** – current conditions, temperature, wind speed
- ❄️ **Snow depth & snowfall forecast** – from Open-Meteo hourly data
- 🎿 **Ski conditions rating** – Excellent / Good / Fair / Poor
- 📅 **3-day forecast** with daily high/low and snowfall
- 🗺️ **Country filter** – quickly switch between French and Swiss resorts
- 📱 **Fully responsive** – works on mobile, tablet, and desktop
- ♿ **Accessible** – semantic HTML, ARIA labels, keyboard navigation
- 🔒 **Secure** – Content-Security-Policy, no API keys, HTTPS only

## Tech Stack

| Layer   | Technology                          |
|---------|-------------------------------------|
| Frontend | Vanilla HTML5 + CSS3 + ES2020 JS   |
| API     | [Open-Meteo](https://open-meteo.com/) (free, no key needed) |
| Hosting | GitHub Pages                        |
| CI/CD   | GitHub Actions                      |

## Deployment

The app is automatically deployed to GitHub Pages on every push to the `main` branch via the workflow in `.github/workflows/deploy.yml`.

## Local Development

No build step required — just open `index.html` in a browser or serve the root folder with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

## Adding a Resort

Edit the `RESORTS` array in `js/app.js`:

```js
{ name: 'MyResort', country: 'France', lat: 45.00, lon: 6.50, altitude: 1200 }
```

## License

MIT