-- =====================================================================
-- supabase/schema.sql – Datenbank für Quizzle
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

-- =====================================================================
-- Konten (Anmelden mit E-Mail und Passwort, lib/konto.js)
--
-- Supabase Auth verwaltet E-Mail und Passwort selbst (Schema „auth“). Hier liegen nur:
--   profile   – Name und Comic-Figur je Konto
--   bestwerte – bester Wert je Quiz und Konto
-- Jeder darf nur seine eigenen Zeilen lesen und schreiben (RLS mit auth.uid()).
-- Das Skript kann gefahrlos mehrmals laufen.
-- =====================================================================

create table if not exists profile (
  id              uuid primary key references auth.users (id) on delete cascade,
  name            text check (char_length(trim(name)) between 1 and 20),
  avatar          text check (avatar ~ '^[0-9.]{0,40}$'),
  aktualisiert_am timestamptz not null default now()
);

alter table profile enable row level security;

drop policy if exists "Eigenes Profil lesen" on profile;
create policy "Eigenes Profil lesen" on profile
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Eigenes Profil anlegen" on profile;
create policy "Eigenes Profil anlegen" on profile
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Eigenes Profil ändern" on profile;
create policy "Eigenes Profil ändern" on profile
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Neues Konto → Profil mit dem Namen aus der Anmeldung (sonst dem Teil der E-Mail vor dem @)
create or replace function public.neues_profil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profile (id, name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 20)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists konto_angelegt on auth.users;
create trigger konto_angelegt
  after insert on auth.users
  for each row execute function public.neues_profil();

create table if not exists bestwerte (
  nutzer          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz            text not null check (char_length(quiz) between 1 and 80),   -- z. B. 'DE:kreise'
  quote           int  not null check (quote between 0 and 100),             -- Prozent
  sekunden        int  not null check (sekunden between 0 and 360000),
  aktualisiert_am timestamptz not null default now(),
  primary key (nutzer, quiz)
);

alter table bestwerte enable row level security;

drop policy if exists "Eigene Bestwerte lesen" on bestwerte;
create policy "Eigene Bestwerte lesen" on bestwerte
  for select to authenticated using ((select auth.uid()) = nutzer);

drop policy if exists "Eigene Bestwerte eintragen" on bestwerte;
create policy "Eigene Bestwerte eintragen" on bestwerte
  for insert to authenticated with check ((select auth.uid()) = nutzer);

drop policy if exists "Eigene Bestwerte ändern" on bestwerte;
create policy "Eigene Bestwerte ändern" on bestwerte
  for update to authenticated using ((select auth.uid()) = nutzer) with check ((select auth.uid()) = nutzer);

-- Konto löschen (DSGVO: jeder kann sein Konto selbst entfernen). Profil und Bestwerte
-- verschwinden mit (on delete cascade); Einträge in der öffentlichen Bestenliste bleiben.
create or replace function public.konto_loeschen()
returns void
language sql
security definer set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.konto_loeschen() from public, anon;
grant execute on function public.konto_loeschen() to authenticated;
