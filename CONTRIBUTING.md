# Contributing to Deckify

Thanks for wanting to help. Deckify is a one-person hobby project, so replies
can take a while — but bug reports with concrete steps are always welcome.

## Bug reports

Use the issue template and include:

- the Deckify version (shown at the bottom of *Settings → System*)
- the Home Assistant version
- the layout and the screen (phone, tablet, desktop)
- **the browser console.** Almost every frontend problem ends up there. If
  the card is completely missing, look for
  `does not provide an export named` or
  `await is only valid in async functions`.

## Development setup

There is no build chain — no npm and no bundler. `src/` contains plain ES
modules, and `tools/build.py` copies them to
`custom_components/deckify/www/`.

```bash
git clone https://github.com/matskkolstad/deckify
cd deckify

# your own values, never committed
cat > tools/deploy.env <<'EOF'
DECKIFY_HOST=hassio@homeassistant.local
DECKIFY_KEY=$HOME/.ssh/id_ed25519
EOF

./tools/deploy.sh --restart
```

`deploy.sh` runs all the checks first and stops on any finding.

## The checks, and why they exist

```bash
python3 tools/bump.py 2.4.3      # version in manifest, const.py, DK_VER and every ?v=
python3 tools/check_imports.py   # missing imports, unknown this._methods, await outside async
python3 -m unittest discover -s tests -p "test_*.py"  # storage, reset and merge
bash tools/mirror.sh             # src/*.js -> tools/.chk/*.mjs
cp tests/fixtures/snapshot.json tools/.chk/snapshot.json
node --test tests/*.test.mjs     # safety, reset, filters, routing, onboarding
node tools/.chk/render.mjs       # renders every view against a synthetic HA snapshot
python3 tools/build.py           # src/ -> custom_components/deckify/www/
```

Four classes of failure never show up in the browser as anything other than
**the whole card disappearing**, and these checks catch them:

1. **Mixed `?v=` values.** The cache buster is part of the module URL, so
   `core.js?v=2.3.0` and `core.js?v=2.2.1` are two different modules. A file
   with an old `?v=` loads an outdated `core.js` and fails with
   “does not provide an export named X”. `bump.py` and `build.py` list the
   directory themselves and refuse to build with mixed versions.
2. **A missing import.** `node --check` only sees syntax, and the render test
   only reaches the branches the test data triggers. `check_imports.py`
   compares used identifiers against imported and locally declared names.
3. **`await` in a method that is not `async`.** Node accepts that in an ES
   module; the browser rejects the whole module.
4. **A backtick inside a CSS comment.** `styles.js` is one large template
   string, so a backtick inside `/* … */` ends the string. The render test
   imports `styles.js` and checks that `CSS` is a string of a reasonable
   length.

## The render test needs a snapshot

`tools/.chk/render.mjs` renders every view against a Home Assistant snapshot
and flags output containing `undefined`, `[object Object]` or `NaN%`. CI uses
the synthetic snapshot in `tests/fixtures/snapshot.json`, so the test can run
without private data. To test against your own home, create your own dump:

```bash
export HASS_URL=http://homeassistant.local:8123
export HASS_TOKEN=<long-lived access token>
python3 tools/dump_snapshot.py        # -> tools/.chk/snapshot.json
```

The personal snapshot is **gitignored on purpose** — it contains every entity
name, state and the location of your home. Do not commit it. The synthetic
snapshot in `tests/fixtures/` is safe to commit.

## Style

- **Norwegian** in code comments, commit messages and the frontend UI.
  Integration strings live in `custom_components/deckify/translations/`;
  documentation is English.
- Comments should explain *why*, and especially why something cannot be done
  the obvious way. That is the only way a pitfall stays fixed.
- **Never put a hex colour directly in a card.** Read the CSS variables so the
  card survives a theme change. Every state rule on a tile or card must be
  prefixed with `.hd`, otherwise `.hd.light …` wins on specificity.
- **No hardcoded entity IDs.** Everything is discovered from Home Assistant's
  own registries; configuration is *overrides*. A hardcoded list stops working
  silently the day something is renamed.
- **Morph the DOM, don't replace `innerHTML`.** Full replacement flickers on
  cards with images and kills focus in a search field mid-word.

## Pull requests

Run `./tools/deploy.sh` (or at least `check_imports.py`, `render.mjs` and
`build.py`) before submitting. CI runs hassfest, HACS validation, `node
--check` on every module, the import check and verifies that
`custom_components/deckify/www/` matches `src/` — so **the dist must be built
and committed**.

## License

By contributing you agree that your code is released under the
[MIT license](LICENSE).
