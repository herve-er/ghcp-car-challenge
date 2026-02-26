/**
 * Météo des Neiges – Alpes Genevoises
 * Fetches live weather data from the Open-Meteo API (https://open-meteo.com/)
 * and renders interactive resort cards.
 */

'use strict';

/* ===========================
   Resort definitions
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
   https://open-meteo.com/en/docs#weathervariables
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
    excellent: { label: '⭐ Excellentes',  class: 'rating-excellent' },
    good:      { label: '✅ Bonnes',        class: 'rating-good' },
    fair:      { label: '⚠️ Passables',    class: 'rating-fair' },
    poor:      { label: '❌ Mauvaises',     class: 'rating-poor' },
};

/**
 * Compute a ski conditions rating based on weather & snow depth.
 * @param {number} code    WMO weather code
 * @param {number} wind    Wind speed in km/h
 * @param {number} snowCm  Snow depth in cm
 * @returns {object} Rating entry from RATINGS
 */
function computeRating(code, wind, snowCm) {
    const isSnowing    = [71, 73, 75, 77, 85, 86].includes(code);
    const isSunny      = [0, 1, 2].includes(code);
    const isStorm      = [95, 96, 99].includes(code);
    const isRain       = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code);
    const highWind     = wind > 60;
    const goodSnowpack = snowCm >= 50;
    const okSnowpack   = snowCm >= 20;

    if (isStorm || isRain) return RATINGS.poor;
    if (highWind)          return RATINGS.fair;
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

/**
 * Build the forecast URL for a resort.
 * @param {object} resort
 * @returns {string}
 */
function buildApiUrl(resort) {
    const params = new URLSearchParams({
        latitude:        resort.lat,
        longitude:       resort.lon,
        current_weather: 'true',
        hourly:          'snow_depth,snowfall,temperature_2m',
        daily:           'weathercode,temperature_2m_max,temperature_2m_min,snowfall_sum,windspeed_10m_max',
        timezone:        'Europe/Paris',
        forecast_days:   '3',
    });
    return `${API_BASE}?${params.toString()}`;
}

/**
 * Fetch weather data for a single resort.
 * @param {object} resort
 * @returns {Promise<object>} Parsed API response
 */
async function fetchResortWeather(resort) {
    const url = buildApiUrl(resort);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} – ${resort.name}`);
    }
    return response.json();
}

/* ===========================
   DOM helpers (safe, no innerHTML for user data)
   =========================== */

/**
 * Create an element with optional classes, text, and attributes.
 * Uses textContent / setAttribute – never innerHTML – to avoid XSS.
 */
function el(tag, { cls = [], text = '', attrs = {} } = {}) {
    const node = document.createElement(tag);
    if (Array.isArray(cls)) cls.forEach(c => c && node.classList.add(c));
    if (text) node.textContent = text;
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
}

/* ===========================
   Skeleton loaders
   =========================== */
function renderSkeletons(container, count) {
    container.textContent = '';
    for (let i = 0; i < count; i++) {
        const card = el('div', { cls: ['skeleton'] });
        card.appendChild(el('div', { cls: ['skeleton-line', 'medium'] }));
        card.appendChild(el('div', { cls: ['skeleton-line', 'short'] }));
        const row = el('div', { attrs: { style: 'display:flex;gap:1rem;margin-top:1rem' } });
        row.appendChild(el('div', { cls: ['skeleton-line', 'tall'] }));
        card.appendChild(row);
        container.appendChild(card);
    }
}

/* ===========================
   Card rendering
   =========================== */

/**
 * Find the snow depth closest to "now" from the hourly series.
 * Returns depth in cm.
 */
function currentSnowDepthCm(hourly) {
    if (!hourly || !hourly.time || !hourly.snow_depth) return null;
    const now = new Date();
    let bestIdx = 0;
    let bestDiff = Infinity;
    hourly.time.forEach((t, i) => {
        const diff = Math.abs(new Date(t) - now);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    });
    const depthM = hourly.snow_depth[bestIdx];
    return depthM != null ? Math.round(depthM * 100) : null;
}

/**
 * Format a date string (YYYY-MM-DD) → short day name in French.
 */
function shortDayFr(dateStr) {
    const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    // Use T12:00:00 (local noon) to avoid DST boundary issues when inferring the weekday
    const d = new Date(`${dateStr}T12:00:00`);
    return DAYS[d.getDay()];
}

/**
 * Build the full resort card DOM node from API data.
 */
function buildResortCard(resort, data) {
    const cw     = data.current_weather;
    const daily  = data.daily;
    const hourly = data.hourly;

    const code     = cw.weathercode;
    const weather  = WMO_CODES[code] || DEFAULT_WEATHER;
    const tempC    = Math.round(cw.temperature);
    const windKmh  = Math.round(cw.windspeed);
    const snowCm   = currentSnowDepthCm(hourly);
    const rating   = computeRating(code, windKmh, snowCm ?? 0);

    // Card wrapper
    const card = el('article', {
        cls: ['resort-card', rating.class],
        attrs: { 'aria-label': `Station ${resort.name}` }
    });

    // --- Header ---
    const header = el('div', { cls: ['card-header'] });
    const nameBlock = el('div');
    nameBlock.appendChild(el('div', { cls: ['resort-name'], text: resort.name }));
    const meta = el('div', { cls: ['resort-meta'] });
    meta.appendChild(el('span', { cls: ['resort-country'], text: resort.country }));
    meta.appendChild(el('span', { cls: ['resort-altitude'], text: `${resort.altitude} m` }));
    nameBlock.appendChild(meta);
    header.appendChild(nameBlock);

    // Compare toggle button
    const compareToggle = el('button', {
        cls: ['compare-toggle-btn'],
        text: '+ Comparer',
        attrs: {
            'aria-pressed': 'false',
            'aria-label': `Sélectionner ${resort.name} pour comparer`,
        },
    });
    compareToggle.addEventListener('click', () => toggleCompare(resort.name));
    header.appendChild(compareToggle);

    card.appendChild(header);

    // --- Current weather ---
    const wMain = el('div', { cls: ['weather-main'] });
    wMain.appendChild(el('div', { cls: ['weather-icon'], text: weather.icon, attrs: { 'aria-hidden': 'true' } }));
    const wInfo = el('div');
    wInfo.appendChild(el('div', { cls: ['weather-temp'], text: `${tempC}°C` }));
    wInfo.appendChild(el('div', { cls: ['weather-desc'], text: weather.desc }));
    wMain.appendChild(wInfo);
    card.appendChild(wMain);

    // --- Stats grid ---
    const statsGrid = el('div', { cls: ['card-stats'] });

    // Snow depth
    const snowStat = el('div', { cls: ['stat-item'] });
    snowStat.appendChild(el('span', { cls: ['stat-label'], text: 'Enneigement' }));
    snowStat.appendChild(el('span', {
        cls: ['stat-value', 'snow-value'],
        text: snowCm != null ? `${snowCm} cm` : '–',
    }));
    statsGrid.appendChild(snowStat);

    // Wind
    const windStat = el('div', { cls: ['stat-item'] });
    windStat.appendChild(el('span', { cls: ['stat-label'], text: 'Vent' }));
    windStat.appendChild(el('span', {
        cls: ['stat-value', windKmh > 60 ? 'wind-high' : ''],
        text: `${windKmh} km/h`,
    }));
    statsGrid.appendChild(windStat);

    // Min / Max temperature from today's daily
    if (daily && daily.temperature_2m_min && daily.temperature_2m_max) {
        const minTemp = Math.round(daily.temperature_2m_min[0]);
        const maxTemp = Math.round(daily.temperature_2m_max[0]);

        const minStat = el('div', { cls: ['stat-item'] });
        minStat.appendChild(el('span', { cls: ['stat-label'], text: 'Min / Max' }));
        minStat.appendChild(el('span', { cls: ['stat-value'], text: `${minTemp}° / ${maxTemp}°C` }));
        statsGrid.appendChild(minStat);

        // Snowfall today
        const snowfallCm = daily.snowfall_sum ? Math.round(daily.snowfall_sum[0]) : 0;
        const sfStat = el('div', { cls: ['stat-item'] });
        sfStat.appendChild(el('span', { cls: ['stat-label'], text: 'Chutes prévues' }));
        sfStat.appendChild(el('span', {
            cls: ['stat-value', 'snow-value'],
            text: `${snowfallCm} cm`,
        }));
        statsGrid.appendChild(sfStat);
    }

    card.appendChild(statsGrid);

    // --- Ski rating ---
    const ratingRow = el('div', { cls: ['ski-rating'] });
    ratingRow.appendChild(el('span', { cls: ['ski-rating-label'], text: 'Conditions ski' }));
    ratingRow.appendChild(el('span', { cls: ['ski-rating-badge', rating.class], text: rating.label }));
    card.appendChild(ratingRow);

    // --- 3-Day Forecast ---
    if (daily && daily.time && daily.time.length >= 3) {
        const forecastSection = el('div', { cls: ['forecast-section'] });
        forecastSection.appendChild(el('div', { cls: ['forecast-title'], text: 'Prévisions 3 jours' }));
        const daysRow = el('div', { cls: ['forecast-days'] });

        for (let i = 0; i < 3; i++) {
            const dayW = WMO_CODES[daily.weathercode[i]] || DEFAULT_WEATHER;
            const dayMin = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[i]) : '–';
            const dayMax = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[i]) : '–';
            const daySnow = daily.snowfall_sum ? Math.round(daily.snowfall_sum[i]) : 0;

            const dayBox = el('div', { cls: ['forecast-day'] });
            dayBox.appendChild(el('div', { cls: ['forecast-day-name'], text: shortDayFr(daily.time[i]) }));
            dayBox.appendChild(el('span', {
                cls: ['forecast-day-icon'],
                text: dayW.icon,
                attrs: { 'aria-label': dayW.desc },
            }));
            dayBox.appendChild(el('div', {
                cls: ['forecast-day-temp'],
                text: `${dayMin}° / ${dayMax}°`,
            }));
            if (daySnow > 0) {
                dayBox.appendChild(el('div', { cls: ['forecast-day-snow'], text: `❄ ${daySnow} cm` }));
            }
            daysRow.appendChild(dayBox);
        }

        forecastSection.appendChild(daysRow);
        card.appendChild(forecastSection);
    }

    return card;
}

/* ===========================
   Filtering
   =========================== */
let allCards = []; // [{resort, card, data}]

function applyFilter(filter) {
    allCards.forEach(({ resort, card }) => {
        const visible = filter === 'all' || resort.country === filter;
        card.style.display = visible ? '' : 'none';
    });
}

function initFilters() {
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            applyFilter(btn.dataset.filter);
        });
    });
}

/* ===========================
   Error handling
   =========================== */
function showError(message) {
    const banner = document.getElementById('errorBanner');
    if (!banner) return;
    banner.textContent = message;
    banner.classList.remove('hidden');
}

function hideError() {
    const banner = document.getElementById('errorBanner');
    if (banner) banner.classList.add('hidden');
}

/* ===========================
   Last-updated timestamp
   =========================== */
function updateTimestamp() {
    const timestampEl = document.getElementById('lastUpdated');
    if (!timestampEl) return;
    const now = new Date();
    timestampEl.textContent = `Mise à jour : ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

/* ===========================
   Comparison Feature
   =========================== */
const selectedForCompare = new Set(); // Set of resort name strings (e.g. 'Chamonix')

function toggleCompare(resortName) {
    if (selectedForCompare.has(resortName)) {
        selectedForCompare.delete(resortName);
    } else if (selectedForCompare.size < 3) {
        selectedForCompare.add(resortName);
    }
    updateCompareUI();
}

function updateCompareUI() {
    const count = selectedForCompare.size;
    const bar = document.getElementById('compareBar');
    const countEl = document.getElementById('compareCount');
    if (!bar || !countEl) return;

    if (count >= 2) {
        bar.classList.remove('hidden');
        countEl.textContent = `${count} station${count > 1 ? 's' : ''} sélectionnée${count > 1 ? 's' : ''}`;
    } else {
        bar.classList.add('hidden');
    }

    allCards.forEach(({ resort, card }) => {
        const isSelected = selectedForCompare.has(resort.name);
        const btn = card.querySelector('.compare-toggle-btn');
        if (btn) {
            btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            btn.textContent = isSelected ? '✓ Sélectionné' : '+ Comparer';
            if (!isSelected && count >= 3) {
                btn.setAttribute('disabled', 'true');
            } else {
                btn.removeAttribute('disabled');
            }
        }
        if (isSelected) {
            card.classList.add('compare-selected');
        } else {
            card.classList.remove('compare-selected');
        }
    });
}

function openCompareModal() {
    const modal = document.getElementById('compareModal');
    const container = document.getElementById('compareTableContainer');
    if (!modal || !container) return;

    const selected = allCards.filter(({ resort }) => selectedForCompare.has(resort.name));
    container.textContent = '';
    container.appendChild(buildCompareTable(selected));

    modal.classList.remove('hidden');
    const closeBtn = document.getElementById('compareModalClose');
    if (closeBtn) closeBtn.focus();
}

function closeCompareModal() {
    const modal = document.getElementById('compareModal');
    if (modal) modal.classList.add('hidden');
}

function buildCompareTable(selected) {
    const wrapper = el('div', { cls: ['compare-table-wrapper'] });
    const table = document.createElement('table');
    table.classList.add('compare-table-el');

    // Header: resort names
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const thEmpty = el('th', { cls: ['compare-th-label'], text: 'Critère' });
    headerRow.appendChild(thEmpty);
    selected.forEach(({ resort }) => {
        const th = el('th', { cls: ['compare-th-resort'] });
        th.appendChild(el('div', { cls: ['compare-resort-name'], text: resort.name }));
        th.appendChild(el('div', { cls: ['compare-resort-meta'], text: `${resort.country} · ${resort.altitude} m` }));
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    function addRow(label, values) {
        const row = document.createElement('tr');
        row.appendChild(el('td', { cls: ['compare-td-label'], text: label }));
        values.forEach(({ text, extraCls = [] }) => {
            const td = el('td', { cls: ['compare-td', ...extraCls] });
            td.textContent = text;
            row.appendChild(td);
        });
        tbody.appendChild(row);
    }

    addRow('Météo actuelle', selected.map(({ data }) => {
        if (!data) return { text: '–' };
        const w = WMO_CODES[data.current_weather.weathercode] || DEFAULT_WEATHER;
        return { text: `${w.icon} ${w.desc}` };
    }));

    addRow('Température', selected.map(({ data }) => {
        if (!data) return { text: '–' };
        return { text: `${Math.round(data.current_weather.temperature)}°C` };
    }));

    addRow('Enneigement', selected.map(({ data }) => {
        if (!data) return { text: '–' };
        const snowCm = currentSnowDepthCm(data.hourly);
        return { text: snowCm != null ? `${snowCm} cm` : '–', extraCls: ['snow-value'] };
    }));

    addRow('Vent', selected.map(({ data }) => {
        if (!data) return { text: '–' };
        const wind = Math.round(data.current_weather.windspeed);
        return { text: `${wind} km/h`, extraCls: wind > 60 ? ['wind-high'] : [] };
    }));

    addRow('Min / Max', selected.map(({ data }) => {
        if (!data || !data.daily || !data.daily.temperature_2m_min) return { text: '–' };
        const min = Math.round(data.daily.temperature_2m_min[0]);
        const max = Math.round(data.daily.temperature_2m_max[0]);
        return { text: `${min}° / ${max}°C` };
    }));

    addRow('Chutes prévues', selected.map(({ data }) => {
        if (!data || !data.daily) return { text: '–' };
        const sf = data.daily.snowfall_sum ? Math.round(data.daily.snowfall_sum[0]) : 0;
        return { text: `${sf} cm`, extraCls: ['snow-value'] };
    }));

    addRow('Conditions ski', selected.map(({ data }) => {
        if (!data) return { text: '–' };
        const cw = data.current_weather;
        const snowCm = currentSnowDepthCm(data.hourly);
        const rating = computeRating(cw.weathercode, Math.round(cw.windspeed), snowCm ?? 0);
        return { text: rating.label, extraCls: [rating.class] };
    }));

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
}

function initCompare() {
    const compareBtn = document.getElementById('compareBtn');
    if (compareBtn) compareBtn.addEventListener('click', openCompareModal);

    const clearBtn = document.getElementById('clearCompareBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
        selectedForCompare.clear();
        updateCompareUI();
    });

    const closeBtn = document.getElementById('compareModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeCompareModal);

    const overlay = document.getElementById('compareModal');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeCompareModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCompareModal();
    });
}

/* ===========================
   Main init
   =========================== */
async function init() {
    const grid = document.getElementById('resortsGrid');
    if (!grid) return;

    renderSkeletons(grid, RESORTS.length);

    const results = await Promise.allSettled(
        RESORTS.map(resort => fetchResortWeather(resort))
    );

    grid.textContent = '';
    allCards = [];

    let errorCount = 0;

    results.forEach((result, i) => {
        const resort = RESORTS[i];
        if (result.status === 'fulfilled') {
            const card = buildResortCard(resort, result.value);
            allCards.push({ resort, card, data: result.value });
            grid.appendChild(card);
        } else {
            errorCount++;
            // Render an error placeholder card
            const errCard = el('article', { cls: ['resort-card', 'rating-poor'] });
            errCard.appendChild(el('div', { cls: ['resort-name'], text: resort.name }));
            errCard.appendChild(el('div', { cls: ['weather-desc'], text: '⚠ Données non disponibles' }));
            allCards.push({ resort, card: errCard, data: null });
            grid.appendChild(errCard);
        }
    });

    if (errorCount > 0) {
        showError(`Impossible de charger les données de ${errorCount} station(s). Vérifiez votre connexion ou réessayez plus tard.`);
    } else {
        hideError();
    }

    updateTimestamp();
    updateCompareUI();

    // Auto-refresh every 30 minutes
    setTimeout(() => { init(); }, 30 * 60 * 1000);
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    initCompare();
    init();
});
