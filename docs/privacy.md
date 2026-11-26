# Privacy

Deckify is local-first. It has no account and no telemetry.

## Where data is stored

- **Dashboard configuration** — rooms, order, hidden cards, sizes, filters,
  sensor bindings and per-card settings are stored by the integration inside
  Home Assistant's `.storage`.
- **Device preferences** — layout, theme when per-screen layout is enabled,
  kiosk options, screensaver delay and content are stored in the browser's
  `localStorage`.
- **Rendered data** — entity states, calendars, to-dos, history, camera
  images and media metadata are read from Home Assistant's own APIs.

Deleting the integration entry removes its server configuration. Browser
preferences remain on that device until the site data is cleared.

## Open-Meteo fallback

Deckify normally reads weather from the Home Assistant weather entity.
If that entity is missing, unavailable or does not provide a forecast,
Deckify can fetch current weather and forecast from
[Open-Meteo](https://open-meteo.com/).

That request is made directly from the browser and includes the latitude and
longitude configured in Home Assistant. No API key is used and no Deckify
server is involved. If you do not want this fallback, keep a working weather
entity configured and available; there is currently no separate opt-out
switch.

## Permissions

- Any logged-in Home Assistant user can **read** a Deckify dashboard.
- Only administrators can **write** the server configuration.
- Non-admin users get a read-only settings view and cannot enter edit mode
  when the dashboard uses a shared layout. If per-screen layout is enabled,
  layout choices are stored locally for that screen.
- The optional **Admins only** setting hides the panel from non-admin users
  entirely.

## External resources

Deckify loads only its own frontend modules from `/deckify_files/`, Home
Assistant's own frontend components, and the bundled Figtree font. Open-Meteo
is the only external service used by the frontend.

Calendar, to-do and history data stays inside your Home Assistant instance.
