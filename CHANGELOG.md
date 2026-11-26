# Changelog

All notable changes to Deckify. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semantic versioning](https://semver.org/).

## [2.5.0] - 2026-11-26

### Added

- **Two layouts: Startskjerm and Oversikt.** Startskjerm is the overview-first
  layout with clock, weather, room cards and summary. Oversikt has a permanent
  sidebar with Home, rooms, Security and More. They share the same data,
  rooms, themes and camera rules.
- **Two themes: Kalk and Skog.** Warm limewash and olive, and deep forest with
  smoked glass. Both use translucent glass surfaces, soft background light and
  solid text tokens for contrast. The main text pairs are above WCAG AA.
- **A More page** for Media, Energy, House and Needs attention, so the main
  navigation stays short.
- **Camera curation.** Camera cards are now ordinary editable cards with the
  same remove and settings menu as other devices. Camera maps from robot
  vacuums, tablet cameras and similar are hidden by default and can be enabled
  in Dashboard settings.
- **Home-room selection** is separate from which areas the dashboard covers.

### Changed

- Navigation is reduced to Home, rooms, Security and More. The old bottom dock
  with seven equal pages is gone from Oversikt; Startskjerm has a small four-item
  dock.
- The theme picker is two curated themes instead of 10 backgrounds, 14 card
  colours and 12 accent colours. Background warmth and the separate
  high-contrast toggle are gone because contrast is built in.
- Settings are grouped around Layout, Dashboard, Appearance, Home, Rooms,
  Navigation and System, with Appearance now holding only the two themes.
- Startskjerm is compacted so the room row and summary fit a 1280×800 tablet
  without clipping.
- Old `grid`, `list` and `focus` layouts are migrated to Startskjerm. Old light
  themes migrate to Kalk and old dark themes to Skog.
- Pages under More are stored separately; Home, Rooms and Security are always
  available.

### Fixed

- Cameras in a room could not be removed. They were rendered outside the
  editable grid and ignored the room's hidden list. They now follow the same
  order, edit and hide rules as every other card.
- Kiosk mode could lose the hidden Home Assistant sidebar and top bar after a
  hash navigation. The kiosk styles are re-applied while the card is mounted.
- A room opened from Startskjerm now has a clear Home back button instead of
  the old room rail.
- Several hardcoded dark text colours on accent surfaces were replaced with
  the theme's accent text, so light and dark themes both keep contrast.

### Documentation

- Documentation is now in English and split into focused pages under `docs/`:
  getting started, configuration, tablet and kiosk, Lovelace card, privacy,
  troubleshooting and development.
- README, `info.md` and `CONTRIBUTING.md` are rewritten in English.
- New landscape tablet screenshots show both layouts and both themes.

## [2.4.3] - 2026-11-26

### Fixed

- Regular users tried to subscribe to `deckify_updated` and received
  `Unauthorized` in the Home Assistant log. The subscription is now created
  only for administrators; other users get an updated view on the next page
  load.

## [2.4.2] - 2026-11-26

### Fixed

- “Deckify as start page” reads and writes HA's `userData.defaultPanel`
  instead of the retired `hass.defaultPanel`. The switch now reports
  “Active now”/“Not active” correctly and can be turned off and on again.

## [2.4.1] - 2026-11-26

### Fixed

- The weather pill in the header now shows the Open-Meteo fallback when the
  selected weather entity is `unavailable`, instead of “–° unavailable”.
- `custom:deckify-card` keeps the bottom dock, edit button, sheets and toasts
  inside the card in a regular Lovelace dashboard. They used to be fixed over
  the whole Home Assistant page.
- “Hide Home Assistant sidebar” now applies only while the Deckify card is
  mounted. It no longer sticks to other dashboards after HA has saved the
  sidebar choice globally.
- The weather subscription is not started for a weather entity that is
  `unavailable` or missing, so it stops filling the console with repeated
  warnings.
- The version text in settings mentions that the weather fallback can use
  Open-Meteo.

## [2.4.0] - 2026-11-26

### Added

- **Onboarding screen.** An empty dashboard now shows “Get started” with a
  choice between filling it automatically from Home Assistant or building it
  yourself.
- **Deep links and history.** View, room, custom pages and focus page are
  stored in the hash URL. Refresh keeps the view, and the browser back button
  returns to the previous Deckify view.
- Keyboard navigation: `Escape` closes sheets, `Tab` stays inside open
  sheets, and clickable surfaces can be activated with Enter or Space.
- A shortcut from dashboard settings to the integration's global settings.
- `custom:deckify-card` can target a specific Deckify dashboard with
  `dashboard: <url-path>` in the card YAML.
- CI now runs the Node tests and the render test with a synthetic Home
  Assistant snapshot.

### Changed

- **“Reset” is split in two.** “Reset layout” resets only order, hidden
  cards, sizes, groups and card settings. Rooms, sensors, filters, pages,
  scenes and colours are kept. “Reset all” still resets the whole dashboard,
  but with a clear warning. The integration's “Reset layout” uses the same
  safe variant.
- Information cards for sensors, binary sensors, people, weather, numbers,
  selects and text open the detail panel on a normal tap. Buttons use `press`
  instead of a non-existent on/off service.
- The screensaver starts after 5 minutes by default, and only in the panel
  dashboard — not in a regular Lovelace card. It does not wake while the tab
  is hidden.
- Height measurement uses `100dvh` where the browser supports it, so the
  bottom dock does not disappear behind the iOS toolbar.
- The device picker's large sorted list is built only when it is actually
  needed. Regular state updates no longer sort every entity.
- `custom:deckify-card` is now registered by a small `register.js`. The heavy
  dashboard module loads only when the card is actually used, not on every
  Home Assistant page for every user.

### Fixed

- **Safety alerts are global.** Smoke, gas, carbon monoxide, leaks and
  doors/windows are shown even when the sensor has no area or lives in a room
  the dashboard does not show. Disconnected smoke and leak sensors become
  critical alerts.
- Settings and editing are hidden or made read-only for users who are not
  administrators, instead of silently discarding changes.
- Invalid regex filters are validated in the integration settings and ignored
  safely in the frontend. A bad rule no longer blanks the whole dashboard.
- `show_unavailable` now has one source: the integration settings. The
  dashboard toggle writes to the same place instead of a local key that was
  ignored.
- An empty calendar list means “no calendars”, not “all”. The choice survives
  saving and updates the calendar immediately.
- Weather, calendar, to-dos, energy price and media favourites update when
  the configuration changes. The weather subscription switches when the
  weather entity switches.
- The dashboard restarts clock, subscriptions and data sources when it
  reconnects, and the panel passes `hass` to the card even if `panel` arrives
  last.
- Kiosk mode restores the sidebar when the option is turned off, and hides
  the top bar directly on `app-header` instead of only through `hui-root`.
- Failed service calls show a visible message instead of only a silent
  console error. A transient config error no longer deletes a loaded
  configuration.
- README explains `dashboard: <url-path>` for the Lovelace card instead of
  promising that the same URL path always works. Personal comments have been
  removed.

## [2.3.0]

### Added

- **Screensaver with a large clock.** Starts after 30 seconds by default and
  can be set to 30 s, 1, 2, 5, 10 or 30 minutes — or off — under
  *Settings → Screensaver*. Shows the time large in the middle of the screen
  with today's date below, and optionally weather, home status, now playing
  and the next calendar event. Smoke, leaks and open doors are always shown.
  A tap, key press or swipe wakes the screen.
- The screensaver **follows the theme**: the same background and colours as
  the dashboard, including the light themes.
- The clock drifts slowly around the screen, so a wall tablet that stays on
  all day does not burn it into the panel.

### Changed

- The delay is stored in **seconds** (`saverSec`) and is shared by all
  screens. The old key `screensaver` held whole minutes — and could therefore
  not express “after 30 seconds” — and was per device. It has been removed;
  if you had set a screensaver before, choose the delay again once.
- The screensaver does not start while you are editing the dashboard or have
  a settings sheet open.

## [2.2.1]

### Added

- **Editable quick tiles.** “Turn everything on/off” on Home and the readings
  in each room (temperature, humidity, door, motion, smoke) are now one row
  you can reorder, remove from and add your own tiles to — lights, scenes,
  scripts or sensors. A separate row per screen: Home and each room.
- **“High contrast”** under *Settings → Appearance → Readability*: denser card
  surfaces, clearer borders and stronger secondary text.

### Changed

- The device picker search is scored and shares code with the global search.
  Multiple words must all match, so “bedroom light” works. Results come as one
  sorted list instead of being spread across room headings, what you have
  selected is at the top, and the field has a clear button.
- The top of the device picker follows the theme. It had a hardcoded dark
  colour and became a large dark block in light themes, with invisible domain
  buttons. The domain row scrolls sideways on mobile instead of wrapping over
  five rows.
- Stronger card surfaces and borders in both the light and dark palettes.
- Turned-off devices no longer show a full, coloured slider.

### Fixed

- **Icons sat a couple of pixels too high** in every circle and tile. Home
  Assistant sets `--mdc-icon-size` on the element *inside* `<ha-icon>`, so the
  host became as tall as the line height.
- Camera names inherited the text colour and became dark text on a black
  image in light themes.
- “Overview” remained as an empty heading when nothing had been added.
- `order`, `hidden`, `big`, `seps` and `cards` were merged recursively on the
  server, and a recursive merge can never remove a key. A reset order
  therefore came back on the next load.

## [2.1.1]

### Added

- Light themes (Daylight, Linen, Fog, Peach) with their own text and surface
  colours.
- Access to the Apple TV remote from the media page and from media cards.

### Changed

- A new dashboard starts empty — including the tabs. Only *Home* is on.

### Fixed

- The host element did not paint its own background, so Home Assistant's
  white background showed through under the content.

## [2.0.1]

First version as an **integration** instead of a loose Lovelace card: config
flow, multiple dashboards with their own sidebar entry, server-stored
configuration over WebSocket, automatic discovery of rooms/devices/scenes/
sensors, and per-card settings (size, info, actions, name, icon, colour).

Previously named **HomeDeck**.
