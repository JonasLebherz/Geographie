-- =====================================================================
-- supabase/schema.sql – Datenbank für das Geo-Quiz
--
-- Einmal in Supabase ausführen: SQL Editor → New query → alles einfügen → Run.
-- Die Quizze selbst brauchen keine Datenbank, nur die Bestenliste.
-- =====================================================================

create table if not exists bestenliste (
  id          bigint generated always as identity primary key,
  quiz        text        not null check (char_length(quiz) between 1 and 50),   -- z. B. 'laender'
  name        text        not null check (char_length(trim(name)) between 1 and 20),
  punkte      int         not null check (punkte >= 0),
  fragen      int         not null check (fragen between 1 and 100 and punkte <= fragen),
  sekunden    int         not null check (sekunden between 1 and 36000),        -- Spieldauer, entscheidet bei Gleichstand
  erstellt_am timestamptz not null default now()
);

create index if not exists bestenliste_rang on bestenliste (quiz, punkte desc, sekunden asc);

-- Row Level Security: Ohne Regeln darf der öffentliche Schlüssel (anon) gar nichts.
-- Erlaubt wird nur: alle Einträge lesen und neue Einträge anlegen.
-- Ändern und Löschen geht nur im Supabase-Dashboard.
alter table bestenliste enable row level security;

drop policy if exists "Bestenliste lesen" on bestenliste;
create policy "Bestenliste lesen" on bestenliste
  for select to anon, authenticated using (true);

drop policy if exists "Bestenliste eintragen" on bestenliste;
create policy "Bestenliste eintragen" on bestenliste
  for insert to anon, authenticated with check (true);
