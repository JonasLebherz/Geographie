# Geo-Quiz

Webseite mit Geografie-Quizzen. Im Hauptmenü wählt man die Spielart:

- **Karte** – von der Welt über Kontinente und Länder bis zu den Bundesländern und Landkreisen hineinzoomen; in jedem Gebiet stehen rechts die passenden Quizze (Länder, Hauptstädte, Großstädte, Bundesstaaten/Regionen, Landkreise, Städte). Gesuchtes auf der Karte anklicken: grün beim ersten Versuch, gelb beim zweiten oder dritten, rot aufgedeckt nach drei Fehlversuchen.
- **Länder am Umriss** – ein Umriss, vier Antworten.

**Technik:** Next.js 15 (React 19, JavaScript), Hosting auf **Vercel**, Datenbank **Supabase** (nur für die Bestenliste).

## Starten (lokal)

```bash
npm install
npm run dev        # http://localhost:3000
```

Die Quizze laufen auch ohne Supabase. Für die Bestenliste `.env.example` nach `.env.local` kopieren und die Werte eintragen.

## Einrichtung

### 1. Supabase

1. Auf [supabase.com](https://supabase.com) ein neues Projekt anlegen, Region **Central EU (Frankfurt)**.
2. Links **SQL Editor** → **New query** → den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen → **Run**.
3. **Project Settings → API** (oder oben **Connect**) öffnen und zwei Werte kopieren:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** bzw. **publishable** Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (oder `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
   Den **service_role**/**secret** Key nie verwenden.

### 2. Vercel

1. Auf [vercel.com](https://vercel.com) **Add New… → Project** → dieses GitHub-Repo **Import**.
2. Framework wird automatisch als **Next.js** erkannt, nichts ändern.
3. Unter **Environment Variables** die zwei Werte von oben eintragen.
4. **Deploy**. Nach jedem Push auf `main` baut Vercel die Seite automatisch neu.

Werden die Variablen später geändert: **Deployments → … → Redeploy**, weil `NEXT_PUBLIC_…`-Werte beim Bauen eingesetzt werden.

## Neues Umriss-Quiz hinzufügen

1. Datei in `lib/geodaten/` mit einer Funktion `laden()` anlegen, die `[{ id, name, pfad }]` liefert (Vorlage: `welt-laender.js`, Umrechnung mit `umrissPfad()` aus `umriss.js`).
2. Eintrag in `lib/quizze/index.js`. Die Seite `/quiz/<slug>` und die Kachel auf der Startseite entstehen automatisch.

## Datenquellen

- Länder: [world-atlas](https://github.com/topojson/world-atlas) / Natural Earth (gemeinfrei)
- Regionen weltweit und Städte: [Natural Earth](https://www.naturalearthdata.com/) 1:10 Mio. (gemeinfrei)
- Bundesländer und Kreise: Eurostat GISCO, NUTS 2024 (über [Nuts2json](https://github.com/eurostat/Nuts2json)), © EuroGeographics bezüglich der Verwaltungsgrenzen
- Aufbereitung: `npm run karten-daten` (schreibt `daten/`)
- Deutsche Ländernamen: [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries)
