# Endringslogg

Alle merkbare endringer i Deckify. Formatet følger
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), og versjonene
[semantisk versjonering](https://semver.org/lang/no/).

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
