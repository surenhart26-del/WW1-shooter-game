# Frontline 1916

Een speelbaar first-person WO1-schietspel voor de browser. Zes fictieve missies, geïnspireerd op het Westelijk Front, met een **Lee-Enfield**, **M1911** en **handgranaten**. Alle beelden en geluiden worden lokaal gegenereerd; er zijn geen externe assets, accounts of runtime-dependencies nodig.

## Spelen

Installeer Node.js 20 of nieuwer en voer in de projectmap uit:

```sh
npm start
```

Open vervolgens `http://localhost:8080` in een moderne browser. Een andere poort kan met `PORT=3000 npm start`. De server is uitsluitend bedoeld voor lokale ontwikkeling. Open `index.html` niet rechtstreeks via `file://`, omdat het spel JavaScript-modules gebruikt.

De eerste missie is meteen beschikbaar. Voltooi een missie om de volgende te ontgrendelen. Voortgang wordt opgeslagen in de lokale browser; voltooide missies kun je opnieuw spelen. Er is geen multiplayer of cloudopslag. Desktop met toetsenbord en muis wordt aanbevolen; touchbediening is ook aanwezig.

## Zes missies

1. **De eerste loopgraaf** — herstel het veldstation.
2. **Het stille dorp** — verzamel de koeriersorders.
3. **Het zwarte woud** — markeer de bosroute.
4. **Het stenen fort** — neem het commandopunt over.
5. **Het spoorwegdepot** — zet de spoorwissel om.
6. **De laatste heuvel** — neem het seinpunt in.

Elke sector heeft een eigen kaart, kleurpalet en vijandelijke bezetting. Schakel alle vijanden uit, ga naar de gouden markering en druk op **E** om het missiedoel veilig te stellen. Bereik daarna de groene uitgang. Medische kisten, munitie en granaten worden opgepakt door eroverheen te lopen. Vijanden zoeken je op, maar muren beschermen tegen kogels en granaatschade. Je eigen granaten kunnen je verwonden.

## Besturing

| Actie | Toets |
| --- | --- |
| Bewegen | WASD of ↑ / ↓ |
| Richten | Muis of ← / → |
| Schieten / geselecteerde granaat werpen | Linkermuisknop of spatie |
| Sprinten | Shift |
| Lee-Enfield / M1911 / handgranaat | 1 / 2 / 3 |
| Herladen | R |
| Snel een granaat werpen | G |
| Missiedoel veiligstellen | E |
| Pauze | Esc of P |
| Geluid aan/uit | M |

Klik in het spel om de muis vast te zetten. Als je browser dit blokkeert, blijven pijltjestoetsen en spatie werken. Op een touchscreen: gebruik de richtingsknoppen, sleep over het beeld om te richten en tik op VUUR. Geluid staat standaard uit en kan in het menu worden aangezet. Bij tabwisselen pauzeert het spel automatisch.

## Ontwikkelen en testen

Geen `npm install` of buildstap nodig:

```sh
npm test
```

De tests controleren onder meer alle zes kaarten op bereikbaarheid, wapenwerking, herladen, dekking, granaatschade, botsingen, medische kisten, doodgaan en missievoortgang.

- `missions.js`: kaarten, vijanden, voorraad en doelen.
- `engine.js`: spelregels en simulatie, onafhankelijk van de browser.
- `renderer.js`: Canvas 2D-raycaster, sprites, wapens en minimap.
- `app.js`: besturing, interface, geluid en opgeslagen voortgang.
- `index.html` / `style.css`: menu, briefing en HUD.
- `server.js`: eenvoudige lokale ontwikkelserver.

## Op GitHub Pages spelen

Het spel is een statische website. Kies in de GitHub-repository **Settings → Pages → Deploy from a branch → main → / (root) → Save** om het zelf te publiceren. Daarna toont GitHub de speelbare URL. GitHub Pages hoeft niet ingeschakeld te zijn om lokaal te spelen; deze repository activeert of publiceert Pages niet automatisch.

De veldtocht is fictief en vormt geen historische reconstructie. De gestileerde graphics zijn bewust eenvoudig zodat het spel zonder game-engine, downloads of externe diensten in een browser werkt.
