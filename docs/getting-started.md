# Getting started

## 1. Install the integration

Requires Home Assistant **2024.7** or newer.

### HACS

1. Open HACS → ⋮ → **Custom repositories**.
2. Add `https://github.com/matskkolstad/deckify` as an **Integration**.
3. Search for **Deckify**, install it, and restart Home Assistant.

### Manual

Copy `custom_components/deckify/` into `/config/custom_components/` and restart
Home Assistant.

You do not need to add a Lovelace resource. The integration serves its files
and registers the card itself.

## 2. Add a dashboard

Go to **Settings → Devices & services → Add integration → Deckify**.

Fill in:

- **Name** — the sidebar title.
- **URL path** — the path below `/<path>`. Lowercase letters, digits, `-` and
  `_` are allowed.
- **Sidebar icon** — any Material Design icon.
- **Rooms to include** — leave empty to include every area and discover new
  areas automatically.
- **Show in sidebar** and **Admins only** — visibility and access.

Each config entry is one Deckify dashboard. Add the integration again for a
second dashboard.

## 3. Build the first screen

Open the new sidebar item. The dashboard starts empty and shows **Get
started**:

- **Fill automatically** adds every discovered room, system card and entity.
- **Build it yourself** opens edit mode with an empty canvas.

If you choose to build it yourself:

1. Press **Edit**.
2. Add a room card, a system card or a device.
3. Drag cards to reorder them.
4. Use the cog on a card for size, info text, actions, name, icon and colour.
5. Press **Done**.

A new dashboard only shows the **Home** page by default. Enable more pages
under **Settings → Navigation**.

## 4. Choose a layout

Open **Settings → Layout**:

- **Start screen** — large clock, weather and one summary tile per room.
- **Grid** — cards side by side.
- **Sidebar** — clock, status and rooms in a column. Recommended for a
  landscape tablet.
- **List** — rows with switches, grouped by room.
- **Focus** — one room per screen, with horizontal swiping.

Layout and kiosk choices are stored in the browser and can differ per device.

## 5. Add more cards

In edit mode press **Add devices**. The picker searches names, rooms, domains
and entity IDs at the same time. Multiple words must all match, so
“living room light” finds the ceiling light.

Scenes are added from the **Scenes** button in edit mode.

## 6. Next steps

- [Connect the tablet](tablet-kiosk.md) and hide the Home Assistant sidebar.
- Review [Configuration](configuration.md) for sensors, filters and per-card
  actions.
- If the panel is blank, see [Troubleshooting](troubleshooting.md).
