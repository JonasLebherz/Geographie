# AGENTS.md

Die vollständigen Regeln stehen in `CLAUDE.md`. Kurz:

- Next.js 15, React 19, nur JavaScript. Hosting Vercel, Datenbank Supabase.
- Code, Kommentare und Texte auf Deutsch.
- Neues Umriss-Quiz: Datei in `lib/geodaten/` mit `laden()` + Eintrag in `lib/quizze/index.js`.
- Karten-Erkundung (Welt → Kontinent → Land → Region): `app/karte/`, Daten und Quiz-Sätze in `lib/gebiete/`, Geodaten in `daten/` (neu erzeugen mit `npm run karten-daten`).
- Design angelehnt an Apple HIG, Farbwelt „Atlas“ (Akzent Atlasblau): Farben nur als CSS-Variablen, keine Bedienhinweise oder Emojis in der Oberfläche.
- Oberfläche zweisprachig: Texte über `t('…')` bzw. `<T>…</T>`, Englisch in `lib/sprache/en.js`; danach `npm run texte`.
- Vor jedem Push `npm run build` ausführen.
- Zugangsdaten nur in `.env.local` bzw. bei Vercel, nie im Repository.
