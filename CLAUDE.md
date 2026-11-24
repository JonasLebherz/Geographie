# CLAUDE.md

## Projekt

Geo-Quiz: Webseite mit Geografie-Quizzen (Umrisse erkennen). Jonas schreibt Deutsch; Code, Kommentare und Texte auf Deutsch.
**Technik** wie im Schwesterprojekt Instandhaltung (PitStop 01): Next.js 15 (App Router, React 19, **JavaScript**, kein TypeScript), Hosting **Vercel** (`fra1`), Datenbank **Supabase**.

## Befehle

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # vor jedem Push, muss fehlerfrei sein
```

## Aufbau

- `lib/quizze/index.js` – Liste aller Quizze. Jeder Eintrag verweist per `import()` auf seine Geodaten.
- `lib/geodaten/*.js` – je Quiz eine Datei mit `laden()` → `[{ id, name, pfad }]`. `umriss.js` rechnet GeoJSON in kompakte SVG-Pfade (300×300, ganze Pixel, flächentreue Azimutalprojektion auf das Gebiet zentriert).
- `app/quiz/[slug]/page.js` – wird beim Build statisch erzeugt (`generateStaticParams`), Geodaten werden also nur beim Bauen gelesen, nie zur Laufzeit.
- `app/quiz/[slug]/QuizSpiel.js` – Spiel im Browser (Client-Komponente). Fragen werden erst in `useEffect` gezogen (sonst Hydration-Fehler).
- `app/quiz/[slug]/Bestenliste.js` + `supabase/schema.sql` – Bestenliste über den öffentlichen anon-Key, abgesichert per RLS (nur lesen und einfügen). Ohne Env-Variablen nur ein Hinweis.
- `lib/supabase/client.js` – liefert `null`, wenn Supabase nicht eingerichtet ist.

## Hinweise

- Datenmenge: Alle Umrisse eines Quiz gehen mit der Seite an den Browser (Länder: ca. 500 KB, gzip ca. 180 KB). Für Landkreise (ca. 400, detailliert) die Daten vorher vereinfachen (z. B. `topojson-simplify`) oder pro Frage nachladen.
- Bestenliste ist nicht fälschungssicher (Punkte kommen vom Browser). Für ernsthafte Wertung später serverseitig prüfen.
- `AGENTS.md` (für Codex) verweist auf diese Datei. Bei neuen Konventionen beide aktualisieren.
