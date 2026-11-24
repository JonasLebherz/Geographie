# Geo-Quiz

Geografie-Spiel im Browser. Die Startseite ist eine Weltkarte: Gebiet anklicken (die Kamera fliegt hinein – Welt → Kontinent → Land → Bundesland), rechts ein Quiz wählen (Länder, Hauptstädte, Großstädte, Bundesstaaten/Regionen, Landkreise, Städte) und das Gesuchte auf der Karte finden: grün beim ersten Versuch, gelb beim zweiten oder dritten, rot aufgedeckt nach drei Fehlversuchen. Karte oder Satellitenbild, mit Flüssen, Autobahnen und Wahrzeichen.

**Party:** 1 gegen 1 mit Lobby-Link (z. B. `/party/flinker-pinguin`) – gleiche Fragen, wer zuerst fertig ist, lässt dem anderen noch 10 Sekunden.

**Technik:** Next.js 15 (React 19, JavaScript), Hosting auf **Vercel**, Datenbank **Supabase** (nur für die Bestenliste).

## Starten (lokal)

```bash
npm install
npm run dev        # http://localhost:3000
```

Die Quizze laufen auch ohne Supabase. Für Bestenliste und Party über verschiedene Geräte `.env.example` nach `.env.local` kopieren und die Werte eintragen (ohne Supabase funktioniert die Party nur zwischen zwei Tabs im selben Browser).

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

## Datenquellen

- Länder: [world-atlas](https://github.com/topojson/world-atlas) / Natural Earth (gemeinfrei)
- Regionen weltweit und Städte: [Natural Earth](https://www.naturalearthdata.com/) 1:10 Mio. (gemeinfrei)
- Bundesländer und Kreise: Eurostat GISCO, NUTS 2024 (über [Nuts2json](https://github.com/eurostat/Nuts2json)), © EuroGeographics bezüglich der Verwaltungsgrenzen
- Flüsse, Seen, Autobahnen: Natural Earth (gemeinfrei)
- Satellitenbild: [Sentinel-2 cloudless 2016](https://s2maps.eu) von EOX IT Services GmbH (CC BY 4.0, enthält veränderte Copernicus-Sentinel-Daten 2016)
- Aufbereitung: `npm run karten-daten` (schreibt `daten/`)
- Deutsche Ländernamen: [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries)
