# Lovelace card

Deckify can be used as a regular card in an existing Lovelace dashboard:

```yaml
type: custom:deckify-card
dashboard: deckify
```

`dashboard` is the URL path of the Deckify dashboard, without a leading slash.
The card then reads rooms, sensors, order and card settings from that
dashboard.

Without `dashboard`:

- the card uses Deckify defaults
- it stores device choices locally in the browser
- it does not read or write the server configuration

## What is different in card mode?

The card is contained inside the Lovelace card boundary:

- the bottom dock stays inside the card
- settings sheets and dialogs stay inside the card
- the screensaver does not start
- `Hide Home Assistant sidebar` / `Hide Home Assistant top bar` still apply
  while the card is mounted, and are restored when it is removed

This makes a Deckify card safe to use beside other Home Assistant cards.

## Multiple cards

Use a different `dashboard` value on each card if you maintain more than one
Deckify dashboard:

```yaml
type: custom:deckify-card
dashboard: living-room
```

```yaml
type: custom:deckify-card
dashboard: office
```

## Updating

The card is registered by a small `register.js` module; the heavy dashboard
module is loaded only when a card is actually used. After a Deckify update,
reload the Lovelace page once. If the card still looks stale, do a hard
refresh.

If the card is blank, open the browser console and check for:

- `does not provide an export named …` — mixed `?v=` modules; reload or
  reinstall the update
- `Custom element not found` — the integration is not loaded or the card was
  added before Home Assistant finished starting
- network errors for `/deckify_files/register.js` — the integration's static
  path is not registered

See [Troubleshooting](troubleshooting.md).
