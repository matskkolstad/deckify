# Deckify

Et helskjerms hjemdashbord for Home Assistant — som en **integrasjon**, ikke
bare et kort. Flere dashbord side om side i sidemenyen, alt oppdages
automatisk fra Områder → Enheter → Entiteter, og hvert eneste kort kan
stilles inn i dashbordet eller fra integrasjonens innstillinger.

![Deckify](docs/startskjerm.png)

## Hva du får

- **Flere dashbord.** Hver gang du legger til integrasjonen får du et nytt
  Deckify-dashbord med eget punkt i sidemenyen, egne rom og eget oppsett.
- **Ingenting er hardkodet.** Rom, enheter, scener, planter, maskiner,
  strømmåler, pris, vær, kalendere og gjøremål finnes av seg selv. Døper du
  om scenene i Hue-appen, følger Deckify etter uten at du gjør noe.
- **Tomt fra start.** Et nytt dashbord er blankt med vilje — du legger inn
  rom, systemkort og enheter selv. Vil du heller at det fyller seg selv, er
  det én bryter (*Oppførsel → Fyll dashbordet automatisk*).
- **Felles eller eget oppsett per skjerm.** Som standard ser nettbrettet,
  telefonen og PC-en nøyaktig det samme, lagret på tjeneren. Slår du på
  *Eget oppsett per skjerm*, kan hver enhet ha sin egen rekkefølge, sine
  skjulte kort og sine farger.
- **Kortinnstillinger** per kort: størrelse (1×1, 2×1, 1×2, 2×2), hva
  infoteksten viser, hva trykk / hold / dobbelttrykk gjør (av–på,
  detaljpanel, HAs infovindu, kjør scene, naviger, kall en tjeneste), eget
  navn, eget ikon, egen farge og bekreftelse før handling.
- **Fem layouter:** Startskjerm, Rutenett, Sidekolonne, Liste og Fokus.
- **Sider:** Hjem, Rom, Media, Huset, Energi, Sikkerhet og «Trenger tilsyn».
- Dra-og-slipp-redigering som virker med finger, detaljpanel per domene,
  værvarsel med Open-Meteo som reserve, kalender, gjøremål, globalt søk,
  medieutforsker med høyttalergruppering, skjermsparer og kioskbrytere.

## Installasjon

### HACS (anbefalt)

1. HACS → ⋮ → **Egendefinerte arkiver** → legg til dette arkivet som
   kategori **Integration**.
2. Søk opp **Deckify**, installer, og **start Home Assistant på nytt**.
3. **Innstillinger → Enheter og tjenester → Legg til integrasjon → Deckify**.

### Manuelt

Kopier `custom_components/deckify/` til `/config/custom_components/` og start
Home Assistant på nytt.

Du trenger **ikke** registrere noen Lovelace-ressurs. Integrasjonen serverer
frontend-filene selv på `/deckify_files/` og registrerer kortet for alle
dashbord.

## Oppsett

Når du legger til integrasjonen velger du navn, URL-sti, ikon og hvilke rom
dashbordet skal dekke (tomt = alle, og nye rom oppdages fortløpende).

Trykk ⚙ på integrasjonskortet for resten:

| Side | Hva du styrer |
|---|---|
| **Generelt** | navn, ikon, vis i sidemenyen, kun for administratorer |
| **Oppførsel** | fyll dashbordet automatisk, eget oppsett per skjerm |
| **Rom** | hvilke områder som er med |
| **Enheter** | skjul entiteter, brytere som skal telle som lys, hva som krever bekreftelse |
| **Sensorer** | overstyr vær, strøm, pris, utetemperatur, gjøremål … (tomt = finn selv) |
| **Sider** | hvilke sider menylinja viser |
| **Scener** | festede scener, hvor mange som vises, korte navn |
| **Avanserte filtre** | ignorerte integrasjoner, regex-filtre, batterigrense |
| **Nullstill oppsett** | tøm rekkefølge, skjulte kort, størrelser og kortinnstillinger |

Det samme kan endres inne i dashbordet under **Innstillinger → Dashbord** —
begge skriver til samme sted.

## Som vanlig Lovelace-kort

Kortet kan også brukes i et hvilket som helst dashbord:

```yaml
type: custom:deckify-card
```

Da leses oppsettet fra Deckify-dashbordet med samme URL-sti hvis det finnes;
ellers kjører kortet på standardverdier og lagrer bare lokalt.

## Utvikling

```bash
python3 tools/bump.py 2.0.2     # versjon i manifest, const.py, DK_VER og alle ?v=
python3 tools/check_imports.py  # manglende importer, ukjente this._metoder, await i ikke-async
./tools/mirror.sh               # speil src/ til tools/.chk/*.mjs
node tools/.chk/render.mjs      # rendrer alle visninger mot et ekte HA-øyeblikksbilde
python3 tools/build.py          # src/ -> custom_components/deckify/www/
./tools/deploy.sh --restart     # last opp til HA og start på nytt
```

`?v=` er del av modul-URL-en og **må** bumpes i alle filer samtidig — to
ulike `?v=` er to forskjellige moduler for nettleseren, og en modul som
laster en utdatert `core.js` feiler med «does not provide an export named X».
`bump.py` og `build.py` lister mappa selv og nekter å bygge med blandede
versjoner.

## Lisens

MIT.
