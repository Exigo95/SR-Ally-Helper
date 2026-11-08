# Verbündeten-Schmiede

Desktop-App zum Erstellen von **Verbündetengeistern** für Shadowrun 5 (Regeln aus dem *Straßengrimoire*, Abschnitt „Verbündetengeister“). Deutsche Oberfläche im Dark Mode.

## Starten

Voraussetzung: [Node.js](https://nodejs.org) (LTS) ist installiert.

```bash
npm install
npm start
```

Unter Windows kannst du auch einfach `start.bat` doppelklicken.

**Ohne Installation:** `src/index.html` lässt sich direkt im Browser öffnen. Dort funktioniert alles genauso, nur eben im Browserfenster.

## Online hosten (GitHub Pages)

Die App ist eine reine statische Seite, jeder Besucher hat seine eigenen Daten (im Browser gespeichert, `localStorage`).

1. Neues Repository auf GitHub anlegen und diesen Ordner hochladen (Branch `main`).
2. Im Repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Der mitgelieferte Workflow (`.github/workflows/pages.yml`) veröffentlicht den Ordner `src/` bei jedem Push automatisch.
4. Die Adresse lautet danach `https://<dein-name>.github.io/<repo-name>/`.

Hinweis: Gespeicherte Daten gehören zum Browser und zur Adresse. Wer Browser oder Gerät wechselt oder die Browserdaten löscht, sollte vorher über **Speichern** eine JSON-Datei sichern und sie später mit **Laden** wieder einlesen.

## Als eigenständige Anwendung packen (optional)

```bash
npm run dist:win     # portable .exe   (Windows)
npm run dist:mac     # .dmg            (macOS)
npm run dist:linux   # AppImage        (Linux)
```

Das Ergebnis liegt danach im Ordner `dist/`.

## Was die App kann

| Schritt | Inhalt |
|---|---|
| 1 · Beschwörer | Tradition (bestimmt die Geistertypen, Zuordnung frei änderbar), Magie, Initiatengrad, Edge, Herbeirufen/Binden, Arkana/Logik, Entzug, Loge, Karma-Budget |
| 2 · Grunddaten & Kraft | Name, Heimat-Metaebene, Konzept, Kraft (8 Karma × Kraft, max. 2 × Magie) |
| 3 · Gestalt | Materialisierung / Innewohnen / Besessenheit, Zusatzgestalten (je 2 Karma), Gefäß |
| 4 · Kräfte | Basiskräfte automatisch, 1 Gratiskraft pro Kraftpunkt aus dem Traditionspool, jede weitere 5 Karma, Element-/Detailangaben |
| 5 · Fertigkeiten | Basisfertigkeiten automatisch, zusätzliche je 5 Karma, die Beschwörungsgruppe ist gesperrt |
| 6 · Zauber | 3 Karma (Beschwörer kennt den Zauber) / 5 Karma (unbekannt) |
| 7 · Übersicht & Ritual | Werteblock, alle Proben (Formel, Herbeirufen, Binden, Entzug, Losreißen), Voraussetzungs-Check, Rechner für das Ritual der Wandlung (16 Karma je Kraftpunkt) |

Außerdem: automatisches Zwischenspeichern, Speichern und Laden als JSON, Werteblock als Text kopieren, Drucken oder als PDF speichern.

## Regelannahmen

- Der Verbündete ist ein Geist eines **Geistertyps** deiner Tradition. Attribute = Kraft + Modifikator des Typs, Magie und Essenz = Kraft, Edge = Edge des Beschwörers. Die Modifikatoren lassen sich in Schritt 2 abschalten.
- Alle Fertigkeiten = Kraft, alle Limits = Kraft.
- **Aus den Büchern geprüft:** alle sechs Geistertypen des Grundregelwerks (Luft, Erde, Feuer, Wasser, Mensch, Tier; S. 302 f.) und die vier neuen aus dem Straßengrimoire (Beschützer, Helfer, Pflanze, Ratgeber; S. 223 f.), jeweils mit Attributen, Initiative, Kräften und Fertigkeiten. Dazu die neuen Geisterkräfte, die Bewohnung und die Besessenheit.
- **Traditionen:** Voodoo, Straßenhexen, Pfad des Rades, Schwarze Magie, Druidische Tradition, Christliche Theurgie und Chaosmagie stammen aus dem Straßengrimoire (inkl. Entzug und bevorzugten Zaubern als Schnellauswahl). Hermetik, Schamanismus und Buddhismus sind noch nicht geprüft und in der Auswahl entsprechend gekennzeichnet. Die Zuordnung Kategorie → Geistertyp ist in Schritt 1 frei änderbar.
- Die Regeltexte aus den Büchern sind bewusst nicht enthalten, nur Namen, Werte und Kurzzusammenfassungen.
