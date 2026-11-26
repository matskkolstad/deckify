/* Deckify — weather.js
 * Værdata med reserve. Normalt leses alt fra værenheten i Home Assistant,
 * men den kan være `unavailable` i timevis (integrasjonen mister kontakt,
 * leverandøren er nede). Da henter vi i stedet fra Open-Meteo, som er gratis
 * og ikke krever nøkkel, basert på hjemmets egne koordinater.
 */
import { WEATHER_ICON, WEATHER_TEXT, isDead } from "./core.js?v=2.4.0";

/* Open-Meteos WMO-koder oversatt til HA sine tilstandsnavn, så resten av
   kortet slipper å vite hvor dataene kom fra. */
const WMO = {
  0: "sunny", 1: "partlycloudy", 2: "partlycloudy", 3: "cloudy",
  45: "fog", 48: "fog",
  51: "rainy", 53: "rainy", 55: "rainy", 56: "rainy", 57: "rainy",
  61: "rainy", 63: "rainy", 65: "pouring", 66: "rainy", 67: "pouring",
  71: "snowy", 73: "snowy", 75: "snowy", 77: "snowy",
  80: "rainy", 81: "rainy", 82: "pouring",
  85: "snowy", 86: "snowy",
  95: "lightning", 96: "lightning-rainy", 99: "lightning-rainy",
};

const CACHE_MS = 20 * 60 * 1000;   /* 20 min — været endrer seg ikke fortere */
let cache = null;
let inflight = null;

function coords(hass) {
  const c = hass?.config || {};
  if (typeof c.latitude === "number" && typeof c.longitude === "number")
    return { lat: c.latitude, lon: c.longitude };
  return null;
}

/** Henter fra Open-Meteo. Returnerer null hvis noe går galt. */
async function fetchOpenMeteo(lat, lon) {
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`
    + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
    + "is_day,precipitation,weather_code,wind_speed_10m,pressure_msl"
    + "&hourly=temperature_2m,weather_code,precipitation_probability"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,"
    + "precipitation_probability_max,sunrise,sunset"
    + "&timezone=auto&forecast_days=7";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j = await r.json();
    const cur = j.current || {};
    const daily = j.daily || {};
    const hourly = j.hourly || {};

    const now = Date.now();
    const hIdx = (hourly.time || []).findIndex((t2) => Date.parse(t2) >= now);
    const start = hIdx < 0 ? 0 : hIdx;

    return {
      kilde: "Open-Meteo",
      state: WMO[cur.weather_code] || "cloudy",
      temperature: cur.temperature_2m,
      apparent: cur.apparent_temperature,
      humidity: cur.relative_humidity_2m,
      wind: cur.wind_speed_10m,
      pressure: cur.pressure_msl,
      precipitation: cur.precipitation,
      sunrise: (daily.sunrise || [])[0],
      sunset: (daily.sunset || [])[0],
      hourly: (hourly.time || []).slice(start, start + 24).map((t2, i) => ({
        datetime: t2,
        temperature: (hourly.temperature_2m || [])[start + i],
        condition: WMO[(hourly.weather_code || [])[start + i]] || "cloudy",
        precipitation_probability: (hourly.precipitation_probability || [])[start + i],
      })),
      daily: (daily.time || []).map((t2, i) => ({
        datetime: t2,
        condition: WMO[(daily.weather_code || [])[i]] || "cloudy",
        temperature: (daily.temperature_2m_max || [])[i],
        templow: (daily.temperature_2m_min || [])[i],
        precipitation_probability: (daily.precipitation_probability_max || [])[i],
      })),
    };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Starter en henting hvis cachen er gammel. Kaller `onDone` når nye data kom. */
export function ensureFallback(hass, onDone) {
  if (cache && Date.now() - cache.t < CACHE_MS) return cache.data;
  if (inflight) return cache?.data || null;
  const c = coords(hass);
  if (!c) return null;
  inflight = fetchOpenMeteo(c.lat, c.lon).then((data) => {
    inflight = null;
    if (data) {
      cache = { t: Date.now(), data };
      if (onDone) onDone();
    } else {
      /* ikke mas hvert sekund hvis nettet er nede */
      cache = { t: Date.now() - CACHE_MS + 120000, data: cache?.data || null };
    }
  });
  return cache?.data || null;
}

/**
 * Samlet værbilde. Bruker HA-enheten når den lever, ellers Open-Meteo.
 * Returnerer alltid samme form, så visningene slipper å vite forskjellen.
 */
export function weatherData(ctx, onDone) {
  const { hass, cfg } = ctx;
  const st = cfg.weatherEntity ? hass.states[cfg.weatherEntity] : null;

  if (st && !isDead(st)) {
    const a = st.attributes || {};
    return {
      ok: true, kilde: null, state: st.state,
      temperature: a.temperature, apparent: a.apparent_temperature,
      humidity: a.humidity, wind: a.wind_speed, pressure: a.pressure,
      precipitation: a.precipitation,
      hourly: ctx.forecastHourly || [], daily: ctx.forecastDaily || [],
      sunrise: hass.states["sun.sun"]?.attributes?.next_rising,
      sunset: hass.states["sun.sun"]?.attributes?.next_setting,
    };
  }

  const fb = ensureFallback(hass, onDone);
  if (fb) return { ok: true, ...fb };
  return { ok: false, kilde: null, state: null, hourly: [], daily: [] };
}

export function weatherIcon(state) {
  return WEATHER_ICON[state] || "mdi:weather-cloudy";
}
export function weatherText(state) {
  return WEATHER_TEXT[state] || state || "–";
}
