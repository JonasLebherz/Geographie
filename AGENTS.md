# AGENTS.md

Die vollständigen Regeln stehen in `CLAUDE.md`. Kurz:

- Next.js 15, React 19, nur JavaScript. Hosting Vercel, Datenbank Supabase.
- Code, Kommentare und Texte auf Deutsch.
- Startseite = Karte (Welt → Kontinent → Land → Region): `app/karte/`, Daten und Quiz-Sätze in `lib/gebiete/` (Mercator, Satellitenkacheln), Geodaten in `daten/` (neu erzeugen mit `npm run karten-daten`).
- Party 1 gegen 1: `app/party/`, `lib/party/` (Supabase Realtime, lokal BroadcastChannel), Duell in `app/karte/DuellAnsicht.js`.
- Design angelehnt an Apple HIG, Farbwelt „Atlas“ (Akzent Atlasblau): Farben nur als CSS-Variablen, keine Bedienhinweise oder Emojis in der Oberfläche.
- Oberfläche zweisprachig: Texte über `t('…')` bzw. `<T>…</T>`, Englisch in `lib/sprache/en.js`; danach `npm run texte`.
- Vor jedem Push `npm run build` ausführen.
- Zugangsdaten nur in `.env.local` bzw. bei Vercel, nie im Repository.
