# Quizzle

Geografie-Spiel im Browser. Auf der Startseite wählt man, was man spielen will: **Weltkarte** oder **Wissensquiz** (200 leichte Fragen mit vier Antworten in sechs Kategorien: Geografie, Sport, Wissenschaft, Geschichte, Tiere & Natur, Essen & Trinken), weitere Modi sind in Arbeit. In der Weltkarte: Gebiet anklicken (die Kamera fliegt hinein – Welt → Kontinent → Land → Bundesland), rechts ein Quiz wählen und das Gesuchte auf der Karte finden: grün beim ersten Versuch, gelb beim zweiten oder dritten, rot aufgedeckt nach drei Fehlversuchen. Karte oder Satellitenbild. Drei Gestaltungen im Profil: Comic Pixel (Standard), Atlas, alte Seekarte. Wer etwas nicht weiß, drückt „Weiß ich nicht“.

- **Quizze:** Länder, Hauptstädte, Kontinente, größte Städte (Top 10/50/100), Bundesstaaten/Regionen, Landkreise
- **Weitere Quizze:** Flüsse, Sehenswürdigkeiten, Autobahnen, Inseln, Flaggen, Fußballstadien, Autokennzeichen (Deutschland)
- **Am nächsten dran:** irgendwohin klicken, Punkte nach Entfernung – Rekorde (17 Arten, z. B. höchster Punkt, größter See, längster Fluss), höchste Gipfel, „Wo kommt das Essen her?“, Allgemeinwissen (220 Fragen), berühmte Geburtsorte
- **Bilder** von Wikimedia Commons in der Frage (Sehenswürdigkeiten, Stadien, Gipfel, Essen, Personen) und als **Joker** in den anderen Quizzen
- **Alle Quizze** als aufklappbare Liste links (Suche, Filter); ein Klick fliegt hin und startet.

**Party:** bis zu 8 Spieler mit Lobby-Link (z. B. `/party/flinker-pinguin`), auf Wunsch in Teams – gleiche Fragen für alle, Spielregeln beim Gastgeber (Fragen, Joker, Bedenkzeit, feste Ansicht), Jubel mit der eigenen Comic-Figur.

**Freunde** (mit Konto): eigenen Einladungslink teilen – wer ihn öffnet, kann einen als Freund hinzufügen. Freunde direkt zur Party einladen (aus der Freundesliste oder in der Lobby mit „Freunde einladen“); die Einladung erscheint beim Freund sofort unten rechts mit „Beitreten“.

**Profil:** eigene Comic-Figur (Avatar), Stil, Hell/Dunkel, Töne, Sprache. Optional ein **Konto mit E-Mail und Passwort** – dann sind Name, Figur und Bestwerte auf jedem Gerät da.

**Technik:** Next.js 15 (React 19, JavaScript), Hosting auf **Vercel**, Datenbank **Supabase** (Bestenliste, Konten, Party).

## Starten (lokal)

```bash
npm install
npm run dev        # http://localhost:3000
```

Die Quizze laufen auch ohne Supabase. Für Bestenliste und Party über verschiedene Geräte `.env.example` nach `.env.local` kopieren und die Werte eintragen (ohne Supabase funktioniert die Party nur zwischen zwei Tabs im selben Browser).

## Einrichtung

### 1. Supabase

1. Auf [supabase.com](https://supabase.com) ein neues Projekt anlegen, Region **Central EU (Frankfurt)**.
2. Links **SQL Editor** → **New query** → den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen → **Run**. Das Skript kann man jederzeit erneut ausführen (nach Änderungen, z. B. für Freunde und Party-Einladungen) – es legt nur an, was fehlt. Einladungen kommen über **Realtime** sofort an (das Skript trägt die Tabelle `einladungen` in die Veröffentlichung `supabase_realtime` ein); sonst schaut die Seite alle 30 Sekunden nach.
3. **Project Settings → API** (oder oben **Connect**) öffnen und zwei Werte kopieren:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** bzw. **publishable** Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (oder `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
   Den **service_role**/**secret** Key nie verwenden.
4. **Anmelden mit E-Mail** (Authentication):
   - **Sign In / Providers → Email** eingeschaltet lassen („Confirm email“ an = Bestätigungs-Mail vor dem ersten Anmelden).
   - **URL Configuration:** *Site URL* = die Adresse der Seite (z. B. `https://geo-quiz.vercel.app`), unter *Redirect URLs* `https://<deine-adresse>/**` und für lokal `http://localhost:3000/**` eintragen – dorthin führen die Links aus Bestätigungs- und Passwort-Mails.
   - Der eingebaute Mailversand von Supabase schickt nur sehr wenige Mails pro Stunde und ist für Tests gedacht. Für echte Nutzer unter **Authentication → Emails → SMTP Settings** einen eigenen Mailserver eintragen (z. B. Resend, Brevo oder das Postfach des eigenen Anbieters).
   - Die Texte der Mails (deutsch) unter **Authentication → Emails → Templates** anpassen.
5. **Anmelden mit Google** (freiwillig, zusätzlich zur E-Mail):
   1. In der [Google Cloud Console](https://console.cloud.google.com/) ein Projekt anlegen → **Google Auth Platform** (früher „OAuth-Zustimmungsbildschirm“): App-Name „Quizzle“, Support-E-Mail, Zielgruppe **Extern**. Unter *Branding → Autorisierte Domains* die Domain der Seite und `<projekt>.supabase.co` eintragen.
   2. **Clients → Client erstellen** → Typ **Webanwendung**. *Autorisierte JavaScript-Quellen:* die Adresse der Seite (z. B. `https://geographie-eight.vercel.app`) und `http://localhost:3000`. *Autorisierte Weiterleitungs-URIs:* die **Callback-URL** aus Supabase (Authentication → Sign In / Providers → Google, sieht aus wie `https://<projekt>.supabase.co/auth/v1/callback`). Client-ID und Clientschlüssel kopieren.
   3. In Supabase: **Authentication → Sign In / Providers → Google** einschalten, Client-ID und Clientschlüssel eintragen, speichern.
   4. Bei Vercel die Umgebungsvariable `NEXT_PUBLIC_ANMELDEN_GOOGLE` = `an` anlegen und neu bereitstellen (Redeploy). Erst dann erscheint „Mit Google anmelden“.
   5. Solange die App in Google auf „Testen“ steht, können sich nur eingetragene Testnutzer anmelden – für alle: unter *Zielgruppe* „App veröffentlichen“ (für Name und E-Mail ist keine Prüfung durch Google nötig).
6. **Statistik** (`/statistik`): Sich selbst als Admin eintragen – erst auf der Seite ein Konto anlegen, dann im SQL Editor:
   ```sql
   insert into admins (nutzer) select id from auth.users where email = 'deine@email.de' on conflict do nothing;
   ```
   Danach (neu anmelden) erscheint im Profil-Menü „Statistik“. Gezählt wird ohne Cookies und ohne IP; der Ort (Land, Region, Stadt) kommt nur auf Vercel dazu.
7. Vor dem Veröffentlichen Name, Anschrift und E-Mail in [`lib/rechtliches.js`](lib/rechtliches.js) eintragen (Impressum und Datenschutzerklärung).

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
- Flüsse (mit Europa-Ergänzung), Seen, Autobahnen: Natural Earth (gemeinfrei)
- Städte: [GeoNames](https://www.geonames.org/) cities15000 (CC BY 4.0), deutsche Namen über Wikidata
- Sehenswürdigkeiten, Stadien, Inseln, höchste/tiefste Punkte, Einwohner, Geburtsorte, Kfz-Kennzeichen, Flussnamen: [Wikidata](https://www.wikidata.org/) (CC0)
- Flaggen: [flag-icons](https://github.com/lipis/flag-icons) (MIT)
- Teilung Russlands am Ural: [polygon-clipping](https://github.com/mfogel/polygon-clipping) (MIT)
- Schriften (SIL OFL, über @fontsource): IBM Plex Sans, Bricolage Grotesque, Pixelify Sans, Jersey 15, Press Start 2P, VT323, IM Fell English
- Essen, Rekorde der Kontinente, fehlende Inseln: handverlesen (`lib/gebiete/kuratiert.js`); Allgemeinwissen: `lib/gebiete/allgemeinwissen.js`
- Bilder: [Wikimedia Commons](https://commons.wikimedia.org/) (über Wikidata P18; Urheber und Lizenz stehen unter jedem Bild)
- Satellitenbild: [Sentinel-2 cloudless 2016](https://s2maps.eu) von EOX IT Services GmbH (CC BY 4.0, enthält veränderte Copernicus-Sentinel-Daten 2016)
- Aufbereitung: `npm run karten-daten` (schreibt `daten/`) und `npm run wissen-daten` (schreibt `daten/wissen/`, Flaggen nach `public/flaggen/`; braucht Netz zu Wikidata und GeoNames – hinter einem Proxy mit `NODE_USE_ENV_PROXY=1`)
- Deutsche Ländernamen: [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries)
