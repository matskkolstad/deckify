# Configuration

Deckify has two settings surfaces:

1. **Integration options** — the gear on the Deckify integration card.
2. **Dashboard settings** — the gear inside the Deckify panel.

Both write to the same server-side configuration. Integration options are best
for global setup; dashboard settings are best for day-to-day changes and
per-screen appearance.

Some values are device-specific and stay in the browser:

- layout
- hide Home Assistant sidebar / top bar
- screensaver delay and contents
- per-screen layout when **Per-screen layout** is enabled

## Integration options

### General

| Setting | Description |
|---|---|
| Name | Dashboard title and sidebar title |
| Sidebar icon | Any `mdi:` icon |
| Show in sidebar | Hide the dashboard without deleting it |
| Admins only | Only administrators may open the panel |

The URL path is fixed when the entry is created.

### Behaviour

- **Fill the dashboard automatically** — import discovered rooms, cards and
  entities and keep adding new ones. Off means the dashboard stays exactly as
  you arranged it.
- **Per-screen layout** — each browser gets its own order, hidden cards and
  colours. When off, the server layout is shared by every screen.

A dashboard with auto-fill off starts empty on purpose. Room cards, system
cards and devices can still be added manually.

### Areas

Choose which Home Assistant areas belong to this dashboard. Empty means all
areas, including areas created later.

Entities that are not assigned to an area still appear in the global device
picker and in safety alerts, but not inside a room.

### Devices

- **Hidden entities** — remove entities completely from this dashboard.
- **Switches treated as lights** — count smart plugs and similar as lights in
  room status and “turn all off”.
- **Confirmation prefixes** — entity-ID prefixes that require confirmation,
  for example `lock.` and `siren.` (one prefix per line).
- **Show unavailable entities** — show entities without contact, dimmed,
  instead of hiding them. This is the single source for that choice; the
  dashboard toggle writes the same value.

### Sensors

Deckify discovers sensors automatically. Override any slot when the automatic
choice is wrong:

- weather entity
- climate/thermostat
- outdoor temperature and humidity
- total power (W)
- energy meter (kWh)
- current, next, lowest and highest electricity price
- to-do list
- alarm helper (`input_boolean`)
- calendars and power devices

Empty means “find it automatically”.

### Pages

Choose which pages appear in the dock: Home, Rooms, Media, House, Energy,
Security and Needs attention.

The dashboard's **Navigation** pane uses the same list. The integration
options also list **Start screen**; it is the Start screen layout of Home
rather than a separate dock page.

The **Home** page is always available as a fallback; if every page is turned
off, Home is kept.

### Scenes

- **Pinned scenes** — always show these scenes.
- **Maximum scenes** — 0 means all discovered scenes.
- **Discover new scenes** — add new scenes automatically when auto-fill is on.
- **Short names** — remove duplicated room prefixes such as
  “Living Room Living Room Relax” → “Relax”.

### Advanced filters

- **Ignored integrations** — platform names to skip.
- **Ignored entity IDs** — regex patterns. Invalid patterns are rejected by
  the integration; a pattern that becomes invalid is ignored by the frontend
  instead of blanking the dashboard.
- **Battery warning** — percentage threshold for the Needs attention page.

### Reset layout

Clears card order, hidden cards, sizes, groups and per-card settings. Rooms,
sensors, filters, pages, scenes and colours are kept.

A separate **Reset all** in the dashboard settings clears the whole server
configuration and is intended as a last resort.

## Dashboard settings

Open the gear in the Deckify header.

### Layout

Choose one of the five layouts and enter edit mode. Layout choice is stored
per device.

### Dashboard (global server setup)

Areas, auto-fill, per-screen layout, scenes and excluded entities. The same
values as the integration options, plus a shortcut to the integration
settings.

### Appearance

Card colour, accent colour, background, automatic warm background and high
contrast. These values are shared unless per-screen layout is enabled.

### Home

Show/hide weather, calendar, to-dos, people, seconds and unavailable entities;
clock format and scene strip options.

### Rooms

Show or hide a room card on Home and jump to hidden cards in a room.

### Navigation

Enable pages, create custom pages, hide the Home Assistant sidebar/top bar,
choose the screensaver delay and contents, and set Deckify as the default
panel.

### System

Calendars, to-do list, version information and reset actions.

## Per-card settings

Open the cog on a card in edit mode.

| Setting | Options |
|---|---|
| Size | 1×1, 2×1, 1×2, 2×2 |
| Info | Automatic, state, temperature, humidity, power, energy, battery, last changed, area, none |
| Tap | Default, toggle, detail panel, HA more-info, run, navigate, service, none |
| Hold | Same as tap |
| Double tap | None or one of the actions |
| Name / icon / colour | Per-card overrides |
| Confirmation | Ask before running the action |

Default tap behaviour depends on the domain:

- lights, switches, covers, climate, media players, locks, vacuums, sirens,
  scripts, scenes and automations toggle or run.
- buttons and input buttons are pressed.
- sensors, binary sensors, numbers, selects, text, weather, people and other
  information cards open the detail panel.

## Storage and migrations

The server configuration is stored in Home Assistant’s `.storage` through the
integration. Device choices use `localStorage` keys based on the dashboard
instance.

See [Privacy](privacy.md) and [Troubleshooting](troubleshooting.md).
