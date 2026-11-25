# AGENTS.md

Die vollständigen Regeln stehen in `CLAUDE.md`. Kurz:

- Next.js 15, React 19, nur JavaScript. Hosting Vercel, Datenbank Supabase.
- Code, Kommentare und Texte auf Deutsch.
- Startseite = Kacheln (Weltkarte, Baustellen), die Karte liegt unter `/karte` (Welt → Kontinent → Land → Region): `app/karte/`, Frage und Kartenknöpfe in der Kopfleiste über der Karte (`components/karte/Buehne.js`), nie auf der Karte; Daten und Quiz-Sätze in `lib/gebiete/` (Mercator, Satellitenkacheln), Geodaten in `daten/` (neu erzeugen mit `npm run karten-daten`).
- Quiz-Sätze in drei Gruppen (Quizze, Weitere Quizze, „Am nächsten dran“ = Distanz) in `lib/gebiete/index.js`, Wissensdaten in `daten/wissen/` (`npm run wissen-daten`, `lib/gebiete/wissen.js`), Quiz-Liste links `app/karte/QuizListe.js`.
- Party bis 8 Spieler mit Teams: `app/party/`, `lib/party/` (Supabase Realtime, lokal BroadcastChannel, Regeln in `regeln.js`), Partie in `app/karte/DuellAnsicht.js`; Avatar in `components/Avatar.js`.
- Drei Gestaltungen (`app/stile.css`, Einstellung `stil`): Comic Pixel (Standard), Atlas, Seekarte. Farben nur als CSS-Variablen, keine Bedienhinweise oder Emojis in der Oberfläche.
- Oberfläche zweisprachig: Texte über `t('…')` bzw. `<T>…</T>`, Englisch in `lib/sprache/en.js`; danach `npm run texte`.
- Konto: E-Mail + Passwort über Supabase Auth (`lib/konto.js`, `app/konto/`, Tabellen in `supabase/schema.sql`).
- Vor jedem Push `npm run build` ausführen.
- Zugangsdaten nur in `.env.local` bzw. bei Vercel, nie im Repository.
