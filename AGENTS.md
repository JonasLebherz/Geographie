# AGENTS.md

Die vollständigen Regeln stehen in `CLAUDE.md`. Kurz:

- Next.js 15, React 19, nur JavaScript. Hosting Vercel, Datenbank Supabase.
- Code, Kommentare und Texte auf Deutsch.
- Neues Quiz: Datei in `lib/geodaten/` mit `laden()` + Eintrag in `lib/quizze/index.js`.
- Vor jedem Push `npm run build` ausführen.
- Zugangsdaten nur in `.env.local` bzw. bei Vercel, nie im Repository.
