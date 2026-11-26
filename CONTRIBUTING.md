# Bidra til Deckify

Takk for at du vil bidra. Deckify er ett menneskes fritidsprosjekt, så svar
kan ta litt tid — men feilrapporter med konkrete steg er alltid velkomne.

## Feilrapporter

Bruk feilmalen, og ta med:

- hvilken Deckify-versjon (står nederst i *Innstillinger → System*)
- Home Assistant-versjon
- hvilken layout og hvilken skjerm (telefon, nettbrett, PC)
- **nettleserkonsollen.** Nesten alle frontend-feil ender der. Hvis kortet er
  helt borte, se etter `does not provide an export named` eller
  `await is only valid in async functions`.

## Oppsett for utvikling

Du trenger ingen byggekjede — ingen npm, ingen bundler. `src/` er rene
ES-moduler, og `tools/build.py` kopierer dem til
`custom_components/deckify/www/`.

```bash
git clone https://github.com/matskkolstad/deckify
cd deckify

# dine egne verdier, aldri committet
cat > tools/deploy.env <<'EOF'
DECKIFY_HOST=hassio@homeassistant.local
DECKIFY_KEY=$HOME/.ssh/id_ed25519
EOF

./tools/deploy.sh --restart
```

`deploy.sh` kjører alle sjekkene først og avbryter på funn.

## Sjekkene, og hvorfor de finnes

```bash
python3 tools/bump.py 2.3.1      # versjon i manifest, const.py, DK_VER og ALLE ?v=
python3 tools/check_imports.py   # manglende importer, ukjente this._metoder, await i ikke-async
./tools/mirror.sh                # src/*.js -> tools/.chk/*.mjs
node tools/.chk/render.mjs       # rendrer alle visninger mot et ekte HA-øyeblikksbilde
python3 tools/build.py           # src/ -> custom_components/deckify/www/
```

Fire feilklasser kommer aldri til syne i nettleseren som noe annet enn at
**hele kortet forsvinner**, og det er disse sjekkene fanger:

1. **Blandede `?v=`.** Cachebusteren er del av modul-URL-en, så
   `core.js?v=2.3.0` og `core.js?v=2.2.1` er to forskjellige moduler.
   En fil med gammel `?v=` laster en utdatert `core.js` og feiler med
   «does not provide an export named X». `bump.py` og `build.py` lister mappa
   selv og nekter å bygge med blandede versjoner.
2. **Manglende import.** `node --check` ser bare syntaks, og render-testen
   treffer bare grener testdataene utløser. `check_imports.py` sammenligner
   brukte identifikatorer mot importerte og lokalt deklarerte navn.
3. **`await` i en metode som ikke er `async`.** Node godtar det i en ESM-fil;
   nettleseren avviser hele modulen.
4. **Backtick i en CSS-kommentar.** `styles.js` er én stor template-streng, så
   en backtick inne i en `/* … */` avslutter strengen. Render-testen
   importerer `styles.js` og sjekker at `CSS` er en streng av rimelig lengde.

## Render-testen trenger et øyeblikksbilde

`tools/.chk/render.mjs` rendrer hver eneste visning mot et dump av et ekte
Home Assistant og flagger output som inneholder `undefined`,
`[object Object]` eller `NaN%`. Lag ditt eget dump:

```bash
export HASS_URL=http://homeassistant.local:8123
export HASS_TOKEN=<long-lived access token>
python3 tools/dump_snapshot.py        # -> tools/.chk/snapshot.json
```

Filen er **gitignorert med vilje** — den inneholder alle entitetsnavnene,
tilstandene og posisjonen til hjemmet ditt. Ikke commit den.

## Stil

- **Norsk** i kommentarer, commit-meldinger og brukergrensesnitt.
  Oversettelser ligger i `custom_components/deckify/translations/`.
- Kommentarer skal forklare *hvorfor*, og særlig hvorfor noe ikke kan gjøres
  på den åpenbare måten. Det er den eneste måten en fallgruve ikke blir
  gjenoppfunnet.
- **Aldri en hex rett i et kort.** Les CSS-variablene, så overlever det et
  temabytte. Alle tilstandsregler på en brikke eller et kort må prefikses med
  `.hd`, ellers vinner `.hd.light …` på spesifisitet.
- **Ingen hardkodede entitets-id-er.** Alt oppdages fra Home Assistants eget
  register; konfigurasjon er *overstyringer*. En hardkodet liste slutter å
  virke stille den dagen noe døpes om.
- Morph DOM-en, ikke bytt ut `innerHTML`. Full erstatning gir flimring på
  kort med bilder, og fokus i et søkefelt dør midt i et ord.

## Pull requests

Kjør `./tools/deploy.sh` (eller minst `check_imports.py` + `render.mjs` +
`build.py`) før du sender. CI kjører hassfest, HACS-validering, `node --check`
på hver modul, importsjekken og en kontroll på at
`custom_components/deckify/www/` er i takt med `src/` — så **dist må være
bygget og committet**.

## Lisens

Ved å bidra godtar du at koden din gis ut under
[MIT-lisensen](LICENSE).
