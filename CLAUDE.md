# CLAUDE.md

## Projekt

Geo-Quiz: Geografie-Spiel im Browser – Länder, Regionen und Städte auf der Karte finden, allein oder 1 gegen 1. Jonas schreibt Deutsch; Code, Kommentare und Texte auf Deutsch.
**Technik** wie im Schwesterprojekt Instandhaltung (PitStop 01): Next.js 15 (App Router, React 19, **JavaScript**, kein TypeScript), Hosting **Vercel** (`fra1`), Datenbank **Supabase**.

## Befehle

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # vor jedem Push, muss fehlerfrei sein
npm run texte   # fehlende englische Übersetzungen – muss "Alle Texte sind übersetzt." melden
```

## Aufbau

- **Startseite** (`app/page.js`) ist die Karte selbst (Welt) mit Begrüßung (`app/karte/Willkommen.js`: kurz erklärt – ausdrücklicher Wunsch –, „Solo spielen“ schließt sie für die Sitzung, „Mit Freunden“ → Party). Kopfleiste: Logo, Navigation „Spielen“ / „Party“ (`components/Hauptnavigation.js`), Profil. Das frühere Umriss-Quiz gibt es nicht mehr (`/quiz/*` → `/`).
- **Karten-Erkundung** (`/` und `/karte/…`): Welt → Kontinent → Land → Region (nur Deutschland: Bundesland mit Kreisen). Links die Bühne, rechts die Leiste mit Pfad, Quizzen des Gebiets (sortiert nach Sinn – oben, was auf der Ebene am meisten Sinn ergibt, feinere Einheiten wie „Bundesstaaten und Regionen“ weiter unten) und Untergebieten.
  - Adressen: Welt = `/`, darunter `/karte/europa/deutschland/bayern`.
  - `app/karte/Erkundung.js` – Wechsel ohne Neuladen mit **Kamerafahrt wie in Instandhaltung** (`kamerafahrt()`: erst Schwenk, dann senkrechter Zoom, logarithmischer Maßstab, runde weiche Maske beim Hineinzoomen, Web-Animationen) und „Wusch“ (`klang('rein'|'raus')`). Adresse wandert mit (`history.pushState`), Browser-Zurück fliegt hinaus (`popstate`). `?quiz=<satz>` startet direkt ein Quiz (alte Adressen `/kontinente/<x>` leiten in `next.config.mjs` dorthin um). Im Quiz: Frage als Glas-Kapsel über der Karte, Stand/Ergebnis/Bestenliste in der Leiste, Esc beendet.
  - `app/karte/[[...pfad]]/page.js` – statische Seite je Gebiet (bringt die eigene Karte mit). `app/karte-daten/[knoten]/[datei]/route.js` – alle Kartendaten als statische JSON-Dateien (`gebiet.json`, `<satz>.json`), beim Bauen erzeugt (~740 Dateien).
  - `lib/gebiete/index.js` – Gebietsbaum (Kennungen: `welt`, Kontinent-Slug, Staatskürzel `DE`, NUTS `DE2`), `saetze(knoten)` (Quiz-Sätze mit Titel de/en, Anzahl, Rundengröße – über 60 Einheiten 30 zufällige je Runde –, Bestenlisten-Schlüssel `<knoten>:<satz>`, Länder eines Kontinents weiter `kontinent-<slug>`), `gebietDaten(id)` und `satzDaten(id, satz)`. Gleiche Projektion für Karte und Quiz (nichts springt).
  - `lib/gebiete/zeichnen.js` – **Mercator überall** (klassisches 2D-Bild, Wunsch: Europa groß; passt genau zu den Satellitenkacheln), Welt zugeschnitten auf 83° N bis 70° S mit Antarktis, **Nebenkarten** für weit entfernte Teile eines Landes (Gruppierung: Abstand der Einheiten abzüglich ihrer Größe < 600 km gehört zusammen; die größte Gruppe ist die Hauptkarte – so bleibt Indonesien ganz, Hawaii/Alaska/Kanaren/Überseegebiete kommen in Kästen unten), Klickpunkte für Kleinstaaten (< 30 px², klein gezeichnet), `mitte` für den Aufdeck-Ring, **Pastellfarben** wie im politischen Atlas (`einfaerben`: Nachbarn verschieden, keine Grün-/Gelb-/Rottöne – die gehören den Antworten). Umgebung, Gradnetz und Flüsse reichen über den Kartenrand hinaus (`overflow: visible`, `RANDZONE`, bei hohen Karten seitlich mehr: `randSeitlich`).
  - **Orientierung** (`orientierung()` in `lib/gebiete/index.js`): Flüsse und Seen je Ebene unterschiedlich fein (`FEINHEIT`), Autobahnen ab Land, Wahrzeichen (`lib/gebiete/wahrzeichen.js`, handverlesen mit Symbol; Namen nur beim Erkunden, im Städte-Quiz ausgeblendet).
  - **Satellit** (Schalter Karte/Satellit oben rechts, Einstellung `ansicht`): `components/karte/Satellit.js` legt Kacheln „Sentinel-2 cloudless 2016“ (EOX, CC BY 4.0, Quellenangabe in der Karte) unter die Karte; Lage aus `karte.projektionen` (Mercator: x = tx + k·(λ−l0), y = ty − k·ln tan(π/4+φ/2)). Den sichtbaren Ausschnitt meldet `useKartenZoom(…, onAnsicht)`.
  - `lib/gebiete/quellen.js` – lädt die Daten aus `daten/` (siehe unten) und world-atlas; legt bei Staaten mit mehreren Hauptstädten eine fest (`HAUPTSTADT`).
  - `components/karte/KarteEbene.js` (eine Ebene: Erkunden oder Quiz mit Flächen/Städten, Satellit, Wahrzeichen-Symbole), `useQuizRunde.js` (Spiel-Logik: grün = 1. Versuch, gelb = 2./3., rot = nach 3 Fehlversuchen aufgedeckt mit Ring, „Fail“-Posaune und 1,5 s Pause; Serie = Treffer beim ersten Versuch am Stück; `impuls` lässt die Frage-Kapsel aufleuchten/wackeln; Wertung in Prozent, grün voll, gelb halb, 1–3 Sterne ab 50/75/90 %; Bestenliste mit `punkte` = Prozent, `fragen` = 100; Modus `gesteuert` fürs Duell), `useKartenZoom.js` (Mausrad, Ziehen, zwei Finger, Knöpfe; viewBox direkt am Element; nach Ziehen kein Klick).
  - Namen stehen im Quiz bewusst nicht im SVG (kein `title`/`aria-label`), sonst wären sie ablesbar.
  - `lib/geodaten/kontinente.js` – welche Staaten zu welchem Kontinent gehören (UN-Mitglieder + Vatikanstadt, Kosovo, Palästina, Taiwan; Russland und Zypern bei Europa), Umgebung, Einpassung, Ersatzpunkte (Tuvalu fehlt in den Daten).
- **Party (1 gegen 1)**: `/party` (`PartyStart.js`: Lobby erstellen → Wort-Code wie `flinker-pinguin` aus `lib/party/codes.js`, Gastgeber-Merker in sessionStorage; beitreten mit Code oder Link) und `/party/<code>` (`Lobby.js`: Name, Link kopieren, Spieler; darunter die Erkundung mit `party`).
  - Verbindung `lib/party/kanal.js`: Supabase Realtime (Broadcast + Presence, keine Tabelle, nichts gespeichert); ohne Supabase BroadcastChannel (zwei Tabs im selben Browser – so lokal testbar).
  - Gastgeber steuert: Gebietswechsel → Nachricht `gebiet`, Quizstart → `start` mit gemeinsamer Reihenfolge (höchstens 10 Fragen, `DUELL_FRAGEN`), Zurück → `lobby`. Der Gast fliegt mit, seine Leiste ist gesperrt.
  - `app/karte/DuellAnsicht.js`: Wer eine Frage erledigt hat, wartet; der andere hat noch 10 s (Frist je Frage, sonst „Zeit um“ = rot). Beide fertig → nach 1,6 s gemeinsam weiter. Punkte: grün 3, gelb 1, +1 für den schnelleren Treffer – Schiedsrichter ist der Gastgeber (Ankunft bei ihm, Nachricht `bonus`), damit beide Geräte gleich rechnen.
- **Geodaten aufbereiten:** `npm run karten-daten` (`scripts/karten-daten.mjs`) lädt Rohdaten nach `.quellen/` (nicht im Repo) und schreibt `daten/regionen.topo.json` (Natural Earth admin-1, 20 % der Punkte), `daten/de.topo.json` (Eurostat NUTS 2024: Länder + 400 Kreise, über github.com/eurostat/Nuts2json; Quellenangabe „© EuroGeographics“ in der Fußzeile nötig) `daten/orte.json` (Natural Earth, Städte ab 50.000 Einwohnern + Hauptstädte, mit Region per Punkt-in-Fläche), `daten/gewaesser.topo.json` (Flüsse, Seen mit Rang) und `daten/strassen.topo.json` (Autobahnen = Natural Earth `expressway`). Achtung: NUTS läuft andersherum (RFC 7946) – `fuerD3()` dreht die Ringe; die Topologie-Skalierung (`transform`) nie runden.
- Fragen werden erst im Browser (`useEffect`) gemischt – sonst Hydration-Fehler.
- `lib/geodaten/namen.js` – Kennung (ISO-Alpha-2) und deutsche Kurzform („Russland“ statt „Russische Föderation“). Neue Korrekturen dort in `KURZFORM`.
- `components/Bestenliste.js` + `supabase/schema.sql` – Bestenliste über den öffentlichen Schlüssel, abgesichert per RLS (nur lesen und einfügen). Ohne Env-Variablen nur ein Hinweis. `lib/supabase/client.js` liest `NEXT_PUBLIC_SUPABASE_ANON_KEY` oder `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` und liefert `null`, wenn nichts eingerichtet ist.
- `lib/ton.js` – Töne per Web Audio (keine Dateien): `klang('richtig' | 'falsch' | 'aufgedeckt' | 'fertig' | 'rein' | 'raus')` – „aufgedeckt“ ist eine absteigende Posaune (Fail), rein/raus das „Wusch“; beachtet Ton an/aus und Lautstärke.
- **Einstellungen** (`lib/einstellungen.js`, Hook `useEinstellung(name)`): `darstellung` (hell = Standard, dunkel, auto), `ton`, `lautstaerke`, `sprache`, `ansicht` (karte | satellit) – nur im Browser (localStorage `geo-quiz-*`). Bedient im Profil-Menü oben rechts (`components/ProfilMenue.js`, dort auch „Anmelden“ – noch gesperrt). `START_SKRIPT` (`lib/einstellungen-start.js`, bewusst keine Client-Datei) setzt `data-theme` und `lang` im `<head>` vor dem ersten Anzeigen.
- **Sprache Deutsch/Englisch** (`lib/sprache/`): deutscher Text = Schlüssel, englisch in `lib/sprache/en.js`. Client: `const t = useT()` → `t('Text')`, `t('{n} Länder', { n })`, `t.ortsname(gebiet)` (Gebiete haben `name` und `en`). Server-Komponenten: `<T>Text</T>` bzw. `<T text="…" werte={…} />`. Übersetzt wird im Browser (Seiten sind statisch); erst Deutsch, direkt danach die gewählte Sprache. Englische Ländernamen-Kurzformen in `namen.js` (`KURZFORM_EN`).

## Design

Wie im Schwesterprojekt Instandhaltung (PitStop 01), angelehnt an Apples Human Interface Guidelines:

- Eigene Farbwelt „Atlas“ (nicht das Petrol von Instandhaltung): Hintergrund wie helles Kartenpapier (`body::before`), Wasser zartblau, Akzent **Atlasblau** `#2457b5` (dunkel `#7aa7ff`, gefüllte Flächen `--akzent-flaeche` `#2f62c4`) nur für Bedienbares – klar getrennt von Grün/Gelb/Rot der Antworten. Logo in Atlasblau.
- Schrift IBM Plex Sans, für Titel, Fragen und Zahlen **Bricolage Grotesque** (`--schrift-titel`; beide über `@fontsource`, keine Anfrage an Google). Inhalte auf `.karte` (fast deckend), Glas mit Unschärfe nur auf Kopfzeile, Profil-Menü, Frage-Kapsel, Begrüßung, Karten-Schaltern. Bedienelemente wie bei Apple: Segment-Schalter, Kippschalter, Regler.
- **Spielgefühl** (Wunsch: „mehr Spiel, weniger Verwaltungsoberfläche“): Hauptknöpfe mit Unterkante, die beim Drücken nachgibt; Kapsel leuchtet bei Treffer, wackelt bei Fehler; Serie mit Flamme; Sterne im Ergebnis; zarte Höhenlinien im Hintergrund (`body::after`); Logo als App-Symbol (Globus + gelbe Kartennadel).
- Alle Farben als CSS-Variablen in `app/globals.css`: hell in `:root`, dunkel in `:root[data-theme="dark"]`. Standard ist hell. Text ≥ 4,5:1 Kontrast (neue Farben nachrechnen), Schrift ≥ 11 px, Trefferflächen ≥ 44 px.
- **Keine Bedien- oder Erklärhinweise** in der Oberfläche („Klicke auf …“), keine Fragen als Untertitel – nur Fakten („46 Länder“). Ausnahme auf Wunsch: die kurze Erklärung in der Begrüßung der Startseite. Keine Emojis, keine bunten Symbol-Kacheln. Symbole als feine Linien-SVGs (`components/Symbole.js`).
- Bewegung kurz (0,2–0,5 s), bei „Bewegung reduzieren“ aus. Töne dezent und abschaltbar.

## Hinweise

- Datenmenge je Gebiet (ungezippt, gezippt etwa ein Drittel): Welt 100 KB, Europa 380 KB, Asien 530 KB, USA 410 KB, Deutschland 95 KB – größtenteils Umgebung und Gewässer. Weitere Ebenen (Gewässer, Straßen) möglichst nur ab passender Ebene einblenden.
- Kartenausschnitte prüfen: Nach Änderungen an `kontinente.js` oder `zeichnen.js` die Seiten ansehen – Inseln weit draußen (Hawaii, Französisch-Guayana) steuern die `teile`-Kästen bzw. die Nebenkarten.
- Gemeinden innerhalb eines Kreises gibt es noch nicht (Eurostat LAU ist von hier nicht erreichbar); Städte stammen aus Natural Earth (in Deutschland nur 58).
- Effekte in Kurzform (`useEffect(() => ausdruck)`) vermeiden: `element.scrollTo()` liefert im neuen Chromium ein Promise, React hält das für eine Aufräumfunktion und stürzt ab.
- Bestenliste ist nicht fälschungssicher (Punkte kommen vom Browser). Für ernsthafte Wertung später serverseitig prüfen.
- `AGENTS.md` (für Codex) verweist auf diese Datei. Bei neuen Konventionen beide aktualisieren.
