# AGENTS.md

Die vollständigen Regeln stehen in `CLAUDE.md`. Kurz:

- Next.js 15, React 19, nur JavaScript. Hosting Vercel, Datenbank Supabase.
- Code, Kommentare und Texte auf Deutsch.
- Neues Umriss-Quiz: Datei in `lib/geodaten/` mit `laden()` + Eintrag in `lib/quizze/index.js`.
- Modus „Länder eines Kontinents“: `app/kontinente/`, Zuordnung in `lib/geodaten/kontinente.js`, Karten in `lib/geodaten/karte.js`.
- Design wie im Projekt Instandhaltung (Apple HIG): Farben nur als CSS-Variablen, keine Bedienhinweise oder Emojis in der Oberfläche.
- Vor jedem Push `npm run build` ausführen.
- Zugangsdaten nur in `.env.local` bzw. bei Vercel, nie im Repository.
