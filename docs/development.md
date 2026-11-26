# Development

Deckify has no build chain: `src/` contains plain ES modules, and
`tools/build.py` copies them into the integration. There is no npm, bundler
or transpiler.

## Repository layout

```text
src/                         frontend source (ES modules)
custom_components/deckify/   the Home Assistant integration
  www/                       built copy of src/ (committed)
  translations/              integration strings (en, nb)
tests/                       Node and Python tests
tools/                       build, bump, checks, deploy, snapshot dumps
docs/                        user documentation and screenshots
```

## Backend

| File | Responsibility |
|---|---|
| `__init__.py` | Shared setup: static path, card registration, WebSocket API and one sidebar panel per config entry. |
| `config_flow.py` | Add-integration flow and the multi-page options flow. |
| `store.py` | Server-side configuration in HA `.storage`, per dashboard. Merges partial patches and implements the two reset levels. |
| `websocket.py` | Reads and writes the configuration over WebSocket. Reads are open to logged-in users; writes require an administrator. |
| `const.py` | Domain, version, page list, sensor slots and defaults. |

Each config entry is one dashboard. `__init__.py` registers a panel per entry
and passes `entry_id`, title and version to the frontend. The static files
are served from `/deckify_files/` with long cache headers, which is why every
module URL carries `?v=<version>`.

`store.py` treats `order`, `hidden`, `big`, `seps` and `cards` as
**replace-only** keys. The rest is merged recursively, so a patch can update
one sensor slot without deleting its neighbours.

## Frontend modules

| Module | Responsibility |
|---|---|
| `register.js` | Small entry point that registers `custom:deckify-card` and loads the dashboard module lazily. |
| `deckify.js` | The custom element: state, lifecycle, routing, events, actions, edit mode, kiosk and the screensaver timer. |
| `core.js` | Configuration resolution, entity discovery, model building, helpers, storage keys and the lazy device list. |
| `views.js` | Header, Home layouts, Rooms, Media, Security, House, Energy, Needs attention and the dock. |
| `start.js` | The Startskjerm layout. |
| `cards.js` | Card and tile HTML plus the per-card settings sheet. |
| `controls.js` | Domain controls, icons and service calls. |
| `detail.js` | Detail panel per domain. |
| `media.js` | Media page, browser, favourites and speaker grouping. |
| `appletv.js` | Apple TV remote. |
| `overlays.js` | Device picker, scene picker, custom-page editor and other sheets. |
| `search.js` | Global search. |
| `quick.js` | Editable quick tiles on Home and in rooms. |
| `attention.js` | The Needs attention page. |
| `pages.js` | Custom pages. |
| `settings.js` | The dashboard settings sheet. |
| `saver.js` | Screensaver view and delay options. |
| `weather.js` | Weather and Open-Meteo fallback. |
| `morph.js` | DOM morphing used instead of replacing `innerHTML`. |
| `styles.js` | The entire stylesheet as one template string. |

## Building and versioning

```bash
python3 tools/build.py
```

`build.py` copies every `src/*.js` to
`custom_components/deckify/www/`, removes modules that no longer exist in
`src/`, and refuses to build if the `?v=` values disagree with
`manifest.json`.

The version lives in three places:

- `custom_components/deckify/manifest.json`
- `custom_components/deckify/const.py`
- the `?v=` suffix on every module import

Change all of them at once:

```bash
python3 tools/bump.py 2.4.4   # explicit version
python3 tools/bump.py         # or patch +1
python3 tools/build.py
```

Never edit a single `?v=` by hand. Two different values mean two different
modules to the browser, and a file that still imports an old `core.js` fails
with “does not provide an export named …”.

## Tests

```bash
python3 tools/check_imports.py
python3 -m unittest discover -s tests -p "test_*.py"
bash tools/mirror.sh
cp tests/fixtures/snapshot.json tools/.chk/snapshot.json
node --test tests/*.test.mjs
node tools/.chk/render.mjs
```

- `tests/test_store.py` covers storage, merging and the two reset levels.
- `tests/frontend.test.mjs` covers safety alerts, reset behaviour, filters,
  onboarding and the lazy device list.
- `tests/routing.test.mjs` covers hash routing and card configuration.
- `tests/fixtures/snapshot.json` is a synthetic Home Assistant snapshot.
- `tools/.chk/render.mjs` renders every view against the snapshot and fails
  on `undefined`, `[object Object]` or `NaN%` in the output.

`tools/mirror.sh` copies `src/*.js` to `tools/.chk/*.mjs` and rewrites the
`?v=` imports so Node can load them. It deletes only mirrored modules, never
`render.mjs`.

### Testing against your own home

```bash
export HASS_URL=http://homeassistant.local:8123
export HASS_TOKEN=<long-lived access token>
python3 tools/dump_snapshot.py        # -> tools/.chk/snapshot.json
node tools/.chk/render.mjs
```

The personal snapshot is gitignored on purpose: it contains every entity
name, state and the location of your home. Do not commit it.

## Continuous integration

`.github/workflows/validate.yml` runs:

- hassfest
- HACS validation
- `node --check` on every frontend module
- the import and `await` check
- the Python unit tests
- the Node tests and the render test
- a check that `custom_components/deckify/www/` matches `src/`
- a check that no private host or snapshot is committed
- a check that every screenshot referenced by README exists

The dist must therefore be built and committed with every frontend change.

## Deploying to a test instance

Create `tools/deploy.env` with your own host and key:

```bash
cat > tools/deploy.env <<'EOF'
DECKIFY_HOST=hassio@homeassistant.local
DECKIFY_KEY=$HOME/.ssh/id_ed25519
EOF

./tools/deploy.sh            # build, check and upload
./tools/deploy.sh --restart  # ... and restart Home Assistant
```

`deploy.env` is gitignored and must never be committed. `deploy.sh` mirrors
`custom_components/deckify/` and deletes files on the server that no longer
exist locally.

For UI work, run Home Assistant in a separate test container or VM. Never test
experimental builds against the Home Assistant that controls the house.

## Release checklist

1. Make the change in `src/`, never directly in `custom_components/deckify/www/`.
2. Add or update tests and the CHANGELOG.
3. Run the checks above.
4. Bump the version with `tools/bump.py`.
5. Run `tools/build.py` and commit the rebuilt `www/` directory.
6. Tag the release and push.
7. Update the release notes on GitHub.
