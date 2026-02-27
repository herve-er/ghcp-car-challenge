/**
 * Météo des Neiges – Resort Detail Page
 * Displays extended 7-day forecast and a 24 h hourly overview for a single resort.
 */

'use strict';

/* ===========================
   Resort definitions (shared with app.js)
   =========================== */
const RESORTS = [
    { name: 'Chamonix',      country: 'France',  lat: 45.9237, lon:  6.8694, altitude: 1035 },
    { name: 'Verbier',       country: 'Suisse',  lat: 46.0960, lon:  7.2270, altitude: 1500 },
    { name: 'Zermatt',       country: 'Suisse',  lat: 46.0207, lon:  7.7491, altitude: 1620 },
    { name: 'Megève',        country: 'France',  lat: 45.8567, lon:  6.6167, altitude: 1113 },
    { name: 'Les Gets',      country: 'France',  lat: 46.1575, lon:  6.6683, altitude: 1172 },
    { name: 'Crans-Montana', country: 'Suisse',  lat: 46.3110, lon:  7.4820, altitude: 1500 },
    { name: 'Flaine',        country: 'France',  lat: 46.0000, lon:  6.6833, altitude: 1600 },
    { name: 'Saas-Fee',      country: 'Suisse',  lat: 46.1132, lon:  7.9261, altitude: 1800 },
];

/* ===========================
   WMO Weather Code → {icon, description}
   =========================== */
const WMO_CODES = {
    0:  { icon: '☀️',  desc: 'Ciel dégagé' },
    1:  { icon: '🌤️', desc: 'Principalement dégagé' },
    2:  { icon: '⛅',  desc: 'Partiellement nuageux' },
    3:  { icon: '☁️',  desc: 'Couvert' },
    45: { icon: '🌫️', desc: 'Brouillard' },
    48: { icon: '🌫️', desc: 'Brouillard givrant' },
    51: { icon: '🌦️', desc: 'Bruine légère' },
    53: { icon: '🌦️', desc: 'Bruine modérée' },
    55: { icon: '🌦️', desc: 'Bruine dense' },
    61: { icon: '🌧️', desc: 'Pluie légère' },
    63: { icon: '🌧️', desc: 'Pluie modérée' },
    65: { icon: '🌧️', desc: 'Pluie forte' },
    71: { icon: '❄️',  desc: 'Neige légère' },
    73: { icon: '❄️',  desc: 'Neige modérée' },
    75: { icon: '❄️',  desc: 'Neige forte' },
    77: { icon: '🌨️', desc: 'Grains de neige' },
    80: { icon: '🌦️', desc: 'Averses légères' },
    81: { icon: '🌧️', desc: 'Averses modérées' },
    82: { icon: '🌧️', desc: 'Averses violentes' },
    85: { icon: '🌨️', desc: 'Averses de neige légères' },
    86: { icon: '🌨️', desc: 'Averses de neige fortes' },
    95: { icon: '⛈️',  desc: 'Orage' },
    96: { icon: '⛈️',  desc: 'Orage avec grêle' },
    99: { icon: '⛈️',  desc: 'Orage avec forte grêle' },
};

const DEFAULT_WEATHER = { icon: '🌡️', desc: 'Données non disponibles' };

/* ===========================
   Ski Conditions Rating
   =========================== */
const RATINGS = {
    excellent: { label: '⭐ Excellentes', class: 'rating-excellent' },
    good:      { label: '✅ Bonnes',       class: 'rating-good' },
    fair:      { label: '⚠️ Passables',   class: 'rating-fair' },
    poor:      { label: '❌ Mauvaises',    class: 'rating-poor' },
};

function computeRating(code, wind, snowCm) {
    const isSnowing    = [71, 73, 75, 77, 85, 86].includes(code);
    const isSunny      = [0, 1, 2].includes(code);
    const isStorm      = [95, 96, 99].includes(code);
    const isRain       = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code);
    const highWind     = wind > 60;
    const goodSnowpack = snowCm >= 50;
    const okSnowpack   = snowCm >= 20;

    if (isStorm || isRain)         return RATINGS.poor;
    if (highWind)                  return RATINGS.fair;
    if (isSnowing && goodSnowpack) return RATINGS.excellent;
    if (isSunny   && goodSnowpack) return RATINGS.excellent;
    if (goodSnowpack)              return RATINGS.good;
    if (okSnowpack)                return RATINGS.fair;
    return RATINGS.poor;
}

/* ===========================
   Open-Meteo API
   =========================== */
const API_BASE = 'https://api.open-meteo.com/v1/forecast';

// Minimum snow depth (metres) used as denominator floor when scaling the hourly bar chart
const MIN_SNOW_DEPTH_FOR_SCALING = 0.5;

// Auto-refresh interval in milliseconds (30 minutes, matching the footer text)
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

function buildDetailApiUrl(resort) {
    const params = new URLSearchParams({
        latitude:        resort.lat,
        longitude:       resort.lon,
        current_weather: 'true',
        hourly:          'temperature_2m,snow_depth,snowfall,windspeed_10m,weathercode',
        daily:           'weathercode,temperature_2m_max,temperature_2m_min,snowfall_sum,windspeed_10m_max',
        timezone:        'Europe/Paris',
        forecast_days:   '7',
    });
    return `${API_BASE}?${params.toString()}`;
}

async function fetchDetailWeather(resort) {
    const url = buildDetailApiUrl(resort);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

/* ===========================
   DOM helper (safe, no innerHTML for dynamic data)
   =========================== */
function el(tag, { cls = [], text = '', attrs = {} } = {}) {
    const node = document.createElement(tag);
    if (Array.isArray(cls)) cls.forEach(c => c && node.classList.add(c));
    if (text) node.textContent = text;
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
}

/* ===========================
   Shared helpers
   =========================== */
function shortDayFr(dateStr) {
    const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const d = new Date(`${dateStr}T12:00:00`);
    return DAYS[d.getDay()];
}

function currentSnowDepthCm(hourly) {
    if (!hourly || !hourly.time || !hourly.snow_depth) return null;
    const now = new Date();
    let bestIdx = 0, bestDiff = Infinity;
    hourly.time.forEach((t, i) => {
        const diff = Math.abs(new Date(t) - now);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    });
    const depthM = hourly.snow_depth[bestIdx];
    return depthM != null ? Math.round(depthM * 100) : null;
}

/* ===========================
   URL – resort lookup
   =========================== */
function getResortFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('resort');
    return RESORTS.find(r => r.name === name) || null;
}

/* ===========================
   Rendering – current conditions
   =========================== */
function renderCurrentConditions(resort, data) {
    const cw      = data.current_weather;
    const daily   = data.daily;
    const hourly  = data.hourly;
    const code    = cw.weathercode;
    const weather = WMO_CODES[code] || DEFAULT_WEATHER;
    const tempC   = Math.round(cw.temperature);
    const windKmh = Math.round(cw.windspeed);
    const snowCm  = currentSnowDepthCm(hourly);
    const rating  = computeRating(code, windKmh, snowCm ?? 0);

    const section = el('section', {
        cls:   ['detail-current', rating.class],
        attrs: { 'aria-label': 'Conditions actuelles' },
    });

    // Resort header
    const hdr = el('div', { cls: ['detail-resort-header'] });
    hdr.appendChild(el('div', { cls: ['resort-name'], text: resort.name }));
    const meta = el('div', { cls: ['resort-meta'] });
    meta.appendChild(el('span', { cls: ['resort-country'], text: resort.country }));
    meta.appendChild(el('span', { cls: ['resort-altitude'], text: `${resort.altitude} m` }));
    hdr.appendChild(meta);
    section.appendChild(hdr);

    // Weather main
    const wMain = el('div', { cls: ['weather-main'] });
    wMain.appendChild(el('div', { cls: ['weather-icon'], text: weather.icon, attrs: { 'aria-hidden': 'true' } }));
    const wInfo = el('div');
    wInfo.appendChild(el('div', { cls: ['weather-temp'], text: `${tempC}°C` }));
    wInfo.appendChild(el('div', { cls: ['weather-desc'], text: weather.desc }));
    wMain.appendChild(wInfo);
    section.appendChild(wMain);

    // Stats grid
    const statsGrid = el('div', { cls: ['card-stats'] });

    const snowStat = el('div', { cls: ['stat-item'] });
    snowStat.appendChild(el('span', { cls: ['stat-label'], text: 'Enneigement' }));
    snowStat.appendChild(el('span', { cls: ['stat-value', 'snow-value'], text: snowCm != null ? `${snowCm} cm` : '–' }));
    statsGrid.appendChild(snowStat);

    const windStat = el('div', { cls: ['stat-item'] });
    windStat.appendChild(el('span', { cls: ['stat-label'], text: 'Vent' }));
    windStat.appendChild(el('span', { cls: ['stat-value', windKmh > 60 ? 'wind-high' : ''], text: `${windKmh} km/h` }));
    statsGrid.appendChild(windStat);

    if (daily && daily.temperature_2m_min && daily.temperature_2m_max) {
        const minTemp = Math.round(daily.temperature_2m_min[0]);
        const maxTemp = Math.round(daily.temperature_2m_max[0]);
        const minMaxStat = el('div', { cls: ['stat-item'] });
        minMaxStat.appendChild(el('span', { cls: ['stat-label'], text: 'Min / Max' }));
        minMaxStat.appendChild(el('span', { cls: ['stat-value'], text: `${minTemp}° / ${maxTemp}°C` }));
        statsGrid.appendChild(minMaxStat);

        const snowfallCm = daily.snowfall_sum ? Math.round(daily.snowfall_sum[0]) : 0;
        const sfStat = el('div', { cls: ['stat-item'] });
        sfStat.appendChild(el('span', { cls: ['stat-label'], text: 'Chutes prévues' }));
        sfStat.appendChild(el('span', { cls: ['stat-value', 'snow-value'], text: `${snowfallCm} cm` }));
        statsGrid.appendChild(sfStat);
    }

    section.appendChild(statsGrid);

    // Ski rating
    const ratingRow = el('div', { cls: ['ski-rating'] });
    ratingRow.appendChild(el('span', { cls: ['ski-rating-label'], text: 'Conditions ski' }));
    ratingRow.appendChild(el('span', { cls: ['ski-rating-badge', rating.class], text: rating.label }));
    section.appendChild(ratingRow);

    return section;
}

/* ===========================
   Rendering – extended 7-day forecast
   =========================== */
function renderExtendedForecast(data, baseSnowCm) {
    const daily = data.daily;
    if (!daily || !daily.time) return null;

    const section = el('section', { attrs: { 'aria-label': 'Prévisions 7 jours' } });
    section.appendChild(el('h2', { cls: ['detail-section-title'], text: 'Prévisions 7 jours' }));

    const grid = el('div', { cls: ['extended-forecast'] });
    const days = Math.min(daily.time.length, 7);

    for (let i = 0; i < days; i++) {
        const code    = daily.weathercode[i];
        const dayW    = WMO_CODES[code] || DEFAULT_WEATHER;
        const dayMin  = daily.temperature_2m_min  ? Math.round(daily.temperature_2m_min[i])  : '–';
        const dayMax  = daily.temperature_2m_max  ? Math.round(daily.temperature_2m_max[i])  : '–';
        const daySnow = daily.snowfall_sum         ? Math.round(daily.snowfall_sum[i])         : 0;
        const dayWind = daily.windspeed_10m_max    ? Math.round(daily.windspeed_10m_max[i])    : 0;
        const dayRating = computeRating(code, dayWind, baseSnowCm ?? 0);

        const dayCard = el('div', { cls: ['extended-day', dayRating.class] });

        // Day name + short date
        const dayLabel = el('div', { cls: ['extended-day-name'] });
        dayLabel.appendChild(el('span', { cls: ['extended-day-weekday'], text: shortDayFr(daily.time[i]) }));
        const d = new Date(`${daily.time[i]}T12:00:00`);
        const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        dayLabel.appendChild(el('span', { cls: ['extended-day-date'], text: dateStr }));
        dayCard.appendChild(dayLabel);

        dayCard.appendChild(el('span', {
            cls:   ['forecast-day-icon'],
            text:  dayW.icon,
            attrs: { 'aria-label': dayW.desc },
        }));
        dayCard.appendChild(el('div', { cls: ['forecast-day-temp'], text: `${dayMin}° / ${dayMax}°` }));

        // Snow + wind stats
        const dayStats = el('div', { cls: ['extended-day-stats'] });

        const snowItem = el('div', { cls: ['extended-day-stat'] });
        snowItem.appendChild(el('span', { cls: ['stat-label'], text: 'Chutes' }));
        snowItem.appendChild(el('span', { cls: ['stat-value', 'snow-value'], text: `${daySnow} cm` }));
        dayStats.appendChild(snowItem);

        const windItem = el('div', { cls: ['extended-day-stat'] });
        windItem.appendChild(el('span', { cls: ['stat-label'], text: 'Vent max' }));
        windItem.appendChild(el('span', { cls: ['stat-value', dayWind > 60 ? 'wind-high' : ''], text: `${dayWind} km/h` }));
        dayStats.appendChild(windItem);

        dayCard.appendChild(dayStats);
        grid.appendChild(dayCard);
    }

    section.appendChild(grid);
    return section;
}

/* ===========================
   Rendering – 24 h hourly overview
   =========================== */
function renderHourlyOverview(data) {
    const hourly = data.hourly;
    if (!hourly || !hourly.time) return null;

    // Find index closest to now
    const now = new Date();
    let startIdx = 0, bestDiff = Infinity;
    hourly.time.forEach((t, i) => {
        const diff = Math.abs(new Date(t) - now);
        if (diff < bestDiff) { bestDiff = diff; startIdx = i; }
    });

    const count = Math.min(24, hourly.time.length - startIdx);
    if (count <= 0) return null;

    // Maximum snow depth in window for proportional bar scaling
    const maxSnow = Math.max(
        ...hourly.snow_depth.slice(startIdx, startIdx + count).map(v => v ?? 0),
        MIN_SNOW_DEPTH_FOR_SCALING // prevent division by zero
    );

    const section = el('section', { attrs: { 'aria-label': 'Aperçu horaire sur 24 h' } });
    section.appendChild(el('h2', { cls: ['detail-section-title'], text: 'Aperçu horaire – 24 h' }));

    const table = el('table', { cls: ['hourly-table'] });

    // thead
    const thead = el('thead');
    const headerRow = el('tr');
    ['Heure', 'Météo', 'Temp.', 'Enneigement', 'Chutes'].forEach(h => {
        headerRow.appendChild(el('th', { text: h, attrs: { scope: 'col' } }));
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // tbody
    const tbody = el('tbody');
    for (let i = 0; i < count; i++) {
        const idx         = startIdx + i;
        const timeStr     = hourly.time[idx].slice(11, 16); // HH:MM
        const code        = hourly.weathercode ? hourly.weathercode[idx] : undefined;
        const w           = (code != null && WMO_CODES[code]) ? WMO_CODES[code] : DEFAULT_WEATHER;
        const temp        = hourly.temperature_2m ? Math.round(hourly.temperature_2m[idx]) : null;
        const snowDepthM  = hourly.snow_depth ? (hourly.snow_depth[idx] ?? 0) : 0;
        const snowDepthCm = Math.round(snowDepthM * 100);
        const snowfallCm  = hourly.snowfall ? Math.round(hourly.snowfall[idx] ?? 0) : 0;

        const row = el('tr');

        row.appendChild(el('td', { cls: ['hourly-time'], text: timeStr }));

        const iconTd = el('td');
        iconTd.appendChild(el('span', { cls: ['hourly-icon'], text: w.icon, attrs: { 'aria-label': w.desc } }));
        row.appendChild(iconTd);

        row.appendChild(el('td', { cls: ['hourly-temp'], text: temp != null ? `${temp}°C` : '–' }));

        // Snow depth with proportional CSS bar
        const snowDepthTd = el('td', { cls: ['hourly-snow-cell'] });
        const barWrap = el('div', { cls: ['snow-bar-wrap'] });
        const pct = maxSnow > 0 ? Math.min(100, Math.round((snowDepthM / maxSnow) * 100)) : 0;
        const bar = el('div', { cls: ['snow-bar'] });
        bar.setAttribute('style', `width:${pct}%`);
        barWrap.appendChild(bar);
        snowDepthTd.appendChild(barWrap);
        snowDepthTd.appendChild(el('span', { cls: ['snow-bar-label'], text: `${snowDepthCm} cm` }));
        row.appendChild(snowDepthTd);

        row.appendChild(el('td', { cls: ['snow-value'], text: snowfallCm > 0 ? `❄ ${snowfallCm} cm` : '–' }));

        tbody.appendChild(row);
    }
    table.appendChild(tbody);
    section.appendChild(table);
    return section;
}

/* ===========================
   Compose full detail page
   =========================== */
function renderDetailPage(resort, data) {
    const container = document.getElementById('resortDetail');
    if (!container) return;
    container.textContent = '';

    const snowCm   = currentSnowDepthCm(data.hourly);
    const current  = renderCurrentConditions(resort, data);
    const forecast = renderExtendedForecast(data, snowCm ?? 0);
    const hourly   = renderHourlyOverview(data);

    if (current)  container.appendChild(current);
    if (forecast) container.appendChild(forecast);
    if (hourly)   container.appendChild(hourly);
}

/* ===========================
   Skeleton loader
   =========================== */
function renderSkeleton() {
    const container = document.getElementById('resortDetail');
    if (!container) return;
    container.textContent = '';
    const sk = el('div', { cls: ['skeleton'] });
    ['medium', 'short', 'medium', 'medium', 'short', 'short'].forEach(size => {
        sk.appendChild(el('div', { cls: ['skeleton-line', size] }));
    });
    container.appendChild(sk);
}

/* ===========================
   Error banner / timestamp
   =========================== */
function showError(message) {
    const banner = document.getElementById('errorBanner');
    if (!banner) return;
    banner.textContent = message;
    banner.classList.remove('hidden');
}

function updateTimestamp() {
    const ts = document.getElementById('lastUpdated');
    if (!ts) return;
    const now = new Date();
    ts.textContent = `Mise à jour : ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

/* ===========================
   Init
   =========================== */
async function init() {
    const resort = getResortFromUrl();
    if (!resort) {
        showError('Station inconnue. Veuillez retourner à la liste des stations.');
        return;
    }

    const subtitle = document.getElementById('resortSubtitle');
    if (subtitle) subtitle.textContent = `${resort.name} – ${resort.country}`;
    document.title = `${resort.name} – Météo des Neiges`;

    renderSkeleton();

    try {
        const data = await fetchDetailWeather(resort);
        renderDetailPage(resort, data);
        updateTimestamp();
        setTimeout(() => init(), REFRESH_INTERVAL_MS);
    } catch (_err) {
        showError(`Impossible de charger les données pour ${resort.name}. Vérifiez votre connexion ou réessayez plus tard.`);
    }
}

document.addEventListener('DOMContentLoaded', init);
