# Troubleshooting

## The panel is blank

Open the browser console and look for the first error, not the last warning.

Common causes:

- **`does not provide an export named …`** — two different `?v=` versions of
  the frontend modules are loaded. This normally means an update was not
  installed consistently or the browser has an old module cached. Reload,
  then reinstall the update if it persists.
- **`await is only valid in async functions`** — a broken module. Update to
  the latest release; this class of error is checked by CI.
- **404 on `/deckify_files/register.js` or `/deckify_files/deckify.js`** — the
  integration is not loaded or its static path failed to register. Check
  **Settings → System → Logs** for `custom_components.deckify`.
- **`Custom element not found`** — the integration is still starting or the
  panel was opened before Home Assistant finished loading.

A hard refresh (Ctrl/Cmd+Shift+R) is safe.

## The sidebar or top bar stays hidden

Deckify scopes those options to the mounted dashboard. If the sidebar is still
hidden:

1. Open the Deckify panel.
2. Go to **Settings → Navigation**.
3. Turn **Hide Home Assistant sidebar** off.
4. Reload the page once.

If you used an older Deckify version, Home Assistant may have stored the
previous global sidebar choice. Setting it back through the Home Assistant
profile menu (or the Deckify toggle) restores it.

## A room or entity is missing

- Check that the area is selected under **Settings → Dashboard → Rooms**.
- Check that the entity is not hidden, diagnostic, disabled or filtered out in
  the entity registry.
- Check **Advanced filters** for ignored integrations or regex patterns.
- Check the integration's **Devices** page for hidden entities.
- Entities without an area still appear in the device picker and in safety
  alerts, but not inside a room.

## Weather shows “unavailable”

1. Check the configured weather entity in **Settings → Devices & services**.
2. If the entity is unavailable, Deckify tries Open-Meteo as a fallback.
3. If you do not want the fallback, keep a working weather entity configured.
4. If the header still shows stale text, reload the panel once.

## Buttons or cards do not respond

- In edit mode, taps are intentionally ignored for device control.
- A non-admin user cannot edit a shared layout; the settings show a read-only
  note.
- Sensors, numbers and selects open the detail panel instead of toggling.
- Buttons use `press`; scenes and scripts run instead of toggling.
- If a service call fails, a toast is shown. The full error is in the browser
  console.

## Calendars or to-dos are wrong

- Select calendars under **Settings → System**. An empty selection means
  “none”; it no longer falls back to all calendars.
- Select the to-do list under **Settings → System**.
- The integration options also expose calendar and to-do slots under
  **Sensors**.

## Reset

- **Reset layout** clears order, hidden cards, sizes, groups and per-card
  settings. Rooms, sensors, filters, pages and colours are kept.
- **Reset all** clears the whole server configuration and should be used only
  when you want to start over.

Both actions are available under **Settings → System** or in the integration
options.

## Logs and diagnostics

Use **Settings → System → Logs**, filter on `deckify`, and include:

- the exact Deckify version from **Settings → System**
- Home Assistant version
- browser and device
- whether it happens in the panel, the Lovelace card, or both
- the first console error

There is no diagnostics download yet; the version and log excerpt are the
most useful information for a bug report.
