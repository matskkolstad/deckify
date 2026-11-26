# Endringslogg

Alle merkbare endringer i Deckify. Formatet følger
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), og versjonene
[semantisk versjonering](https://semver.org/lang/no/).

## [2.4.3] - 2026-11-26

### Rettet

- Vanlige brukere prøvde å abonnere på `deckify_updated` og fikk
  `Unauthorized` i Home Assistant-loggen. Abonnementet opprettes nå bare for
  administratorer; andre får oppdatert visningen ved neste sidelast.

## [2.4.2] - 2026-11-26

### Rettet

- «Deckify som startside» leser og skriver HAs `userData.defaultPanel` i
  stedet for det utgåtte `hass.defaultPanel`. Bryteren viser nå riktig
  «Aktiv nå»/«Ikke aktiv», og kan slås av og på igjen.

## [2.4.1] - 2026-11-26

### Rettet

- Værpilla i header viser nå Open-Meteo-reserven når den valgte værenheten
  er `unavailable`, i stedet for «–° unavailable».
- `custom:deckify-card` holder bunnmeny, redigeringsknapp, ark og varsel
  innenfor kortet i et vanlig Lovelace-dashbord. Tidligere lå de fast over
  hele Home Assistant-siden.
- «Skjul Home Assistants sidemeny» bruker nå en stil som bare lever så lenge
  Deckify-kortet er montert. Den henger ikke lenger igjen på andre dashbord
  etter at HA har lagret sidefeltvalget globalt.
- Værabonnementet starter ikke mot en værenhet som er `unavailable` eller
  mangler, og slutter dermed å fylle konsollen med gjentatte advarsler.
- Versjonsteksten i innstillingene sier at værfallet kan bruke Open-Meteo.

## [2.4.0] - 2026-11-26

### Lagt til

- **Førstegangsskjerm.** Et tomt dashbord viser nå «Kom i gang» med valget
  mellom å fylle det automatisk fra Home Assistant eller bygge det selv.
- **Dype lenker og historikk.** Visning, rom, egne sider og fokus-side legges
  i hash-URL-en. Refresh beholder visningen, og nettleserens tilbakeknapp går
  til forrige Deckify-visning.
- Tastaturnavigasjon: `Escape` lukker ark, `Tab` holdes inne i åpne ark, og
  klikkbare flater kan aktiveres med Enter eller mellomrom.
- Snarvei fra dashbordinnstillingene til integrasjonens globale innstillinger.
- `custom:deckify-card` kan peke på et bestemt Deckify-dashbord med
  `dashboard: <url-sti>` i kortets YAML.
- CI kjører nå Node-tester og render-testen med et syntetisk HA-øyeblikksbilde.

### Endret

- **«Nullstill» er delt i to.** «Nullstill layout» nullstiller bare
  rekkefølge, skjulte kort, størrelser, grupper og kortinnstillinger. Rom,
  sensorer, filtre, sider, scener og farger beholdes. «Nullstill alt» gjør det
  fortsatt mulig å nullstille hele dashbordet, men med en tydelig advarsel.
  Integrasjonens «Nullstill layout» bruker samme trygge variant.
- Informasjonskort for sensorer, binærsensorer, personer, vær, tall, valg og
  tekst åpner detaljpanelet ved vanlig trykk. Knapper bruker `press` i stedet
  for en av/på-tjeneste som ikke finnes.
- Skjermspareren starter etter 5 minutter som standard, og bare i
  paneldashbordet — ikke i et vanlig Lovelace-kort. Den vekkes ikke mens fanen
  er skjult.
- Høydemål bruker `100dvh` der nettleseren støtter det, slik at bunnmenyen
  ikke forsvinner bak iOS-verktøylinjen.
- Enhetsvelgerens store, sorterte liste bygges først når den faktisk trengs.
  Vanlige tilstandsoppdateringer slipper dermed å sortere alle entiteter.
- `custom:deckify-card` registreres nå av en liten `register.js`. Den tunge
  dashbordmodulen lastes først når kortet faktisk brukes, ikke på hver
  Home Assistant-side for alle brukere.

### Rettet

- **Sikkerhetsvarsler er globale.** Røyk, gass, kullos, lekkasje og dør/vindu
  vises også når sensoren mangler område eller ligger i et rom dashbordet ikke
  viser. Frakoblede røyk- og lekkasjesensorer blir kritiske varsler.
- Innstillinger og redigering skjules eller gjøres skrivebeskyttet for brukere
  som ikke er administrator, i stedet for at endringene stille forsvinner.
- Ugyldige regex-filtre valideres i integrasjonens innstillinger og ignoreres
  trygt i frontend. En dårlig regel gjør ikke lenger hele dashbordet blankt.
- `show_unavailable` har nå én kilde: integrasjonens innstillinger. Valget i
  dashbordet skriver til samme sted i stedet for en lokal nøkkel som ble
  ignorert.
- Tom kalenderliste betyr «ingen kalendere», ikke «alle». Valget overlever
  lagring og oppdaterer kalenderen med én gang.
- Vær, kalender, gjøremål, strømpris og medie-favoritter oppdateres når
  oppsettet endres. Værabonnementet byttes når værenheten byttes.
- Dashbordet starter klokke, abonnementer og datakilder på nytt når det
  kobles til igjen, og panelet gir kortet `hass` selv om `panel` kommer sist.
- Kioskmodus gir sidemenyen tilbake når valget skrus av, og skjuler
  topplinjen direkte på `app-header` i stedet for bare via `hui-root`.
- Feilede tjenestekall gir en synlig melding i stedet for bare en stille
  konsollfeil. En forbigående config-feil sletter ikke lenger et lastet
  oppsett.
- README forklarer `dashboard: <url-sti>` for Lovelace-kortet i stedet for å
  love at samme URL-sti alltid virker. Personlige kommentarer er ryddet.

## [2.3.0]

### Lagt til

- **Skjermsparer med stor klokke.** Starter etter 30 sekunder som standard og
  kan settes til 30 s, 1, 2, 5, 10 eller 30 minutter — eller av — under
  *Innstillinger → Skjermsparer*. Viser klokka stort midt på skjermen med
  dagens dato under, og valgfritt vær, hjemstatus, hva som spilles og neste
  hendelse i kalenderen. Røyk, lekkasje og åpne dører vises alltid.
  Ett trykk, tastetrykk eller sveip vekker skjermen.
- Skjermspareren **følger temaet**: samme bakgrunn og samme farger som
  dashbordet, også i de lyse temaene.
- Klokka driver langsomt rundt på skjermen, slik at et veggnettbrett som står
  på hele døgnet ikke brenner den inn i panelet.

### Endret

- Forsinkelsen lagres i **sekunder** (`saverSec`) og er delt mellom alle
  skjermene. Den gamle nøkkelen `screensaver` holdt hele minutter — og kunne
  dermed ikke uttrykke «etter 30 sekunder» — og var per enhet. Den er fjernet;
  hadde du satt en skjermsparer før, må tiden velges på nytt én gang.
- Skjermspareren starter ikke mens du redigerer dashbordet eller har et
  innstillingsvindu åpent.

## [2.2.1]

### Lagt til

- **Redigerbare hurtigvalg.** «Skru alt på/av» på Hjem og avlesningene i hvert
  rom (temperatur, fuktighet, dør, bevegelse, røyk) er nå én rad du kan
  omrokere, fjerne fra og legge egne brikker i — lys, scener, skript eller
  sensorer. Egen rad per skjerm: Hjem og hvert rom.
- **«Høy kontrast»** under *Innstillinger → Utseende → Lesbarhet*: tettere
  kortflater, tydeligere kanter og sterkere sekundærtekst.

### Endret

- Søket i enhetsvelgeren er poengsatt og deler kode med det globale søket.
  Flere ord må alle treffe, så «soverom lys» funker. Treffene kommer som én
  sortert liste i stedet for spredt over romoverskrifter, det du har valgt
  ligger øverst, og feltet har en tøm-knapp.
- Toppen av enhetsvelgeren følger temaet. Den lå med en hardkodet mørk farge
  og ble en stor mørk kloss i lyse temaer, med usynlige domeneknapper.
  Domenerekka ruller sideveis på mobil i stedet for å brekke over fem rader.
- Sterkere kortflater og kanter i både lys og mørk palett.
- Avslåtte enheter viser ikke lenger en full, farget slider.

### Rettet

- **Ikoner satt et par piksler for høyt** i alle sirkler og brikker.
  Home Assistant setter `--mdc-icon-size` på elementet *inne i* `<ha-icon>`,
  så verten ble så høy som linjehøyden.
- Kameranavnet arvet tekstfargen og ble mørk tekst på et svart bilde i lyse
  temaer.
- «Oversikt» sto igjen som en tom overskrift når ingenting var lagt inn.
- `order`, `hidden`, `big`, `seps` og `cards` ble slått sammen rekursivt på
  tjeneren, og en rekursiv sammenslåing kan aldri fjerne en nøkkel. En
  nullstilt rekkefølge kom derfor tilbake ved neste innlasting.

## [2.1.1]

### Lagt til

- Lyse temaer (Dagslys, Lin, Tåke, Fersken) med egne tekst- og flatefarger.
- Inngang til Apple TV-fjernkontrollen fra mediasiden og fra mediakortene.

### Endret

- Et nytt dashbord er tomt fra start — også fanene. Bare *Hjem* er på.

### Rettet

- Vertselementet malte ikke sin egen bakgrunn, så Home Assistants hvite
  bakgrunn stakk fram under innholdet.

## [2.0.1]

Første versjon som **integrasjon** i stedet for løst Lovelace-kort:
config flow, flere dashbord med eget punkt i sidemenyen, serverlagret oppsett
over WebSocket, automatisk oppdagelse av rom/enheter/scener/sensorer, og
innstillinger per kort (størrelse, info, handlinger, navn, ikon, farge).

Het tidligere **HomeDeck**.
