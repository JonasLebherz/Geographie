# CLAUDE.md

## Projekt

Geo-Quiz: Webseite mit Geografie-Quizzen (Umrisse erkennen). Jonas schreibt Deutsch; Code, Kommentare und Texte auf Deutsch.
**Technik** wie im Schwesterprojekt Instandhaltung (PitStop 01): Next.js 15 (App Router, React 19, **JavaScript**, kein TypeScript), Hosting **Vercel** (`fra1`), Datenbank **Supabase**.

## Befehle

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # vor jedem Push, muss fehlerfrei sein
npm run texte   # fehlende englische Übersetzungen – muss "Alle Texte sind übersetzt." melden
```

## Aufbau

- `app/page.js` – Hauptmenü: je Spielart eine Karte mit Vorschaubild, gruppiert nach Gebiet („Welt“). Keine lange Quiz-Liste. Spielarten: **Karte** (`/karte`) und **Länder am Umriss**.
- **Karten-Erkundung** (`/karte/…`): Welt → Kontinent → Land → Region (nur Deutschland: Bundesland mit Kreisen). Links die Bühne, rechts die Leiste mit Pfad, Quizzen des Gebiets (sortiert nach Sinn – oben, was auf der Ebene am meisten Sinn ergibt, feinere Einheiten wie „Bundesstaaten und Regionen“ weiter unten) und Untergebieten.
  - `app/karte/Erkundung.js` – Wechsel ohne Neuladen mit **Kamerafahrt wie in Instandhaltung** (`kamerafahrt()`: erst Schwenk, dann senkrechter Zoom, logarithmischer Maßstab, runde weiche Maske beim Hineinzoomen, Web-Animationen) und „Wusch“ (`klang('rein'|'raus')`). Adresse wandert mit (`history.pushState`), Browser-Zurück fliegt hinaus (`popstate`). `?quiz=<satz>` startet direkt ein Quiz (alte Adressen `/kontinente/<x>` leiten in `next.config.mjs` dorthin um). Im Quiz: Frage als Glas-Kapsel über der Karte, Stand/Ergebnis/Bestenliste in der Leiste, Esc beendet.
  - `app/karte/[[...pfad]]/page.js` – statische Seite je Gebiet (bringt die eigene Karte mit). `app/karte-daten/[knoten]/[datei]/route.js` – alle Kartendaten als statische JSON-Dateien (`gebiet.json`, `<satz>.json`), beim Bauen erzeugt (~740 Dateien).
  - `lib/gebiete/index.js` – Gebietsbaum (Kennungen: `welt`, Kontinent-Slug, Staatskürzel `DE`, NUTS `DE2`), `saetze(knoten)` (Quiz-Sätze mit Titel de/en, Anzahl, Rundengröße – über 60 Einheiten 30 zufällige je Runde –, Bestenlisten-Schlüssel `<knoten>:<satz>`, Länder eines Kontinents weiter `kontinent-<slug>`), `gebietDaten(id)` und `satzDaten(id, satz)`. Gleiche Projektion für Karte und Quiz (nichts springt).
  - `lib/gebiete/zeichnen.js` – Projektionen (Welt Equal Earth, sonst flächentreu azimutal), **Nebenkarten** für weit entfernte Teile eines Landes (Gruppierung: Abstand der Einheiten abzüglich ihrer Größe < 600 km gehört zusammen; die größte Gruppe ist die Hauptkarte – so bleibt Indonesien ganz, Hawaii/Alaska/Kanaren/Überseegebiete kommen in Kästen unten), Klickpunkte für Kleinstaaten (< 70 px²), `mitte` für den Aufdeck-Ring. Umgebung und Gradnetz reichen über den Kartenrand hinaus (`overflow: visible`).
  - `lib/gebiete/quellen.js` – lädt die Daten aus `daten/` (siehe unten) und world-atlas; legt bei Staaten mit mehreren Hauptstädten eine fest (`HAUPTSTADT`).
  - `components/karte/KarteEbene.js` (eine Ebene: Erkunden oder Quiz mit Flächen/Städten), `useQuizRunde.js` (Spiel-Logik: grün = 1. Versuch, gelb = 2./3., rot = nach 3 Fehlversuchen aufgedeckt mit Ring + 1,5 s Pause; Wertung in Prozent, grün voll, gelb halb; Bestenliste mit `punkte` = Prozent, `fragen` = 100), `useKartenZoom.js` (Mausrad, Ziehen, zwei Finger, Knöpfe; viewBox direkt am Element; nach Ziehen kein Klick).
  - Namen stehen im Quiz bewusst nicht im SVG (kein `title`/`aria-label`), sonst wären sie ablesbar.
  - `lib/geodaten/kontinente.js` – welche Staaten zu welchem Kontinent gehören (UN-Mitglieder + Vatikanstadt, Kosovo, Palästina, Taiwan; Russland und Zypern bei Europa), Umgebung, Einpassung, Ersatzpunkte (Tuvalu fehlt in den Daten).
- **Geodaten aufbereiten:** `npm run karten-daten` (`scripts/karten-daten.mjs`) lädt Rohdaten nach `.quellen/` (nicht im Repo) und schreibt `daten/regionen.topo.json` (Natural Earth admin-1, 20 % der Punkte), `daten/de.topo.json` (Eurostat NUTS 2024: Länder + 400 Kreise, über github.com/eurostat/Nuts2json; Quellenangabe „© EuroGeographics“ in der Fußzeile nötig) und `daten/orte.json` (Natural Earth, Städte ab 50.000 Einwohnern + Hauptstädte, mit Region per Punkt-in-Fläche). Achtung: NUTS läuft andersherum (RFC 7946) – `fuerD3()` dreht die Ringe; die Topologie-Skalierung (`transform`) nie runden.
- **Umriss-Quiz**: `lib/quizze/index.js` (Liste), `lib/geodaten/*.js` mit `laden()` → `[{ id, name, pfad }]`, `umriss.js` (Pfade 300×300, flächentreu), `app/quiz/[slug]/` (Seite + `QuizSpiel.js`). Fragen werden erst in `useEffect` gezogen (sonst Hydration-Fehler).
- `lib/geodaten/namen.js` – Kennung (ISO-Alpha-2) und deutsche Kurzform („Russland“ statt „Russische Föderation“). Neue Korrekturen dort in `KURZFORM`.
- `components/Bestenliste.js` + `supabase/schema.sql` – Bestenliste über den öffentlichen Schlüssel, abgesichert per RLS (nur lesen und einfügen). Ohne Env-Variablen nur ein Hinweis. `lib/supabase/client.js` liest `NEXT_PUBLIC_SUPABASE_ANON_KEY` oder `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` und liefert `null`, wenn nichts eingerichtet ist.
- `lib/ton.js` – Töne per Web Audio (keine Dateien): `klang('richtig' | 'falsch' | 'aufgedeckt' | 'fertig')`, beachtet Ton an/aus und Lautstärke aus den Einstellungen.
- **Einstellungen** (`lib/einstellungen.js`, Hook `useEinstellung(name)`): `darstellung` (hell = Standard, dunkel, auto), `ton`, `lautstaerke`, `sprache` – nur im Browser (localStorage `geo-quiz-*`). Bedient im Profil-Menü oben rechts (`components/ProfilMenue.js`, dort auch „Anmelden“ – noch gesperrt). `START_SKRIPT` (`lib/einstellungen-start.js`, bewusst keine Client-Datei) setzt `data-theme` und `lang` im `<head>` vor dem ersten Anzeigen.
- **Sprache Deutsch/Englisch** (`lib/sprache/`): deutscher Text = Schlüssel, englisch in `lib/sprache/en.js`. Client: `const t = useT()` → `t('Text')`, `t('{n} Länder', { n })`, `t.ortsname(gebiet)` (Gebiete haben `name` und `en`). Server-Komponenten: `<T>Text</T>` bzw. `<T text="…" werte={…} />`. Übersetzt wird im Browser (Seiten sind statisch); erst Deutsch, direkt danach die gewählte Sprache. Englische Ländernamen-Kurzformen in `namen.js` (`KURZFORM_EN`).

## Design

Wie im Schwesterprojekt Instandhaltung (PitStop 01), angelehnt an Apples Human Interface Guidelines:

- Eigene Farbwelt „Atlas“ (nicht das Petrol von Instandhaltung): Hintergrund wie helles Kartenpapier (`body::before`), Wasser zartblau, Akzent **Atlasblau** `#2457b5` (dunkel `#7aa7ff`, gefüllte Flächen `--akzent-flaeche` `#2f62c4`) nur für Bedienbares – klar getrennt von Grün/Gelb/Rot der Antworten. Logo in Atlasblau.
- Schrift IBM Plex Sans (`@fontsource`, keine Anfrage an Google). Inhalte auf `.karte` (fast deckend), Glas mit Unschärfe nur auf Kopfzeile, Profil-Menü und Zoom-Knöpfen. Bedienelemente wie bei Apple: Segment-Schalter, Kippschalter, Regler.
- Alle Farben als CSS-Variablen in `app/globals.css`: hell in `:root`, dunkel in `:root[data-theme="dark"]`. Standard ist hell. Text ≥ 4,5:1 Kontrast (neue Farben nachrechnen), Schrift ≥ 11 px, Trefferflächen ≥ 44 px.
- **Keine Bedien- oder Erklärhinweise** in der Oberfläche („Klicke auf …“), keine Fragen als Untertitel – nur Fakten („46 Länder“). Keine Emojis, keine bunten Symbol-Kacheln. Symbole als feine Linien-SVGs (`components/Symbole.js`).
- Bewegung kurz (0,2–0,5 s), bei „Bewegung reduzieren“ aus. Töne dezent und abschaltbar.

## Hinweise

- Datenmenge: Alle Umrisse eines Quiz gehen mit der Seite an den Browser (Kontinente gezippt ca. 70–190 KB, Umriss-Quiz ca. 180 KB). Für Landkreise (ca. 400, detailliert) die Daten vorher vereinfachen (z. B. `topojson-simplify`) oder pro Frage nachladen.
- Kartenausschnitte prüfen: Nach Änderungen an `kontinente.js` oder `zeichnen.js` die Seiten ansehen – Inseln weit draußen (Hawaii, Französisch-Guayana) steuern die `teile`-Kästen bzw. die Nebenkarten.
- Gemeinden innerhalb eines Kreises gibt es noch nicht (Eurostat LAU ist von hier nicht erreichbar); Städte stammen aus Natural Earth (in Deutschland nur 58).
- Effekte in Kurzform (`useEffect(() => ausdruck)`) vermeiden: `element.scrollTo()` liefert im neuen Chromium ein Promise, React hält das für eine Aufräumfunktion und stürzt ab.
- Bestenliste ist nicht fälschungssicher (Punkte kommen vom Browser). Für ernsthafte Wertung später serverseitig prüfen.
- `AGENTS.md` (für Codex) verweist auf diese Datei. Bei neuen Konventionen beide aktualisieren.
