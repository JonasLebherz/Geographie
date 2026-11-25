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
-- verschwinden mit (on delete cascade), Einträge in der öffentlichen Bestenliste bleiben.
create or replace function public.konto_loeschen()
returns void
language sql
security definer set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.konto_loeschen() from public, anon;
grant execute on function public.konto_loeschen() to authenticated;

-- =====================================================================
-- Statistik (Seite /statistik, nur für Admins)
--
-- ereignisse: anonyme Zählung (Besuch, Seite, Quiz gestartet/beendet, Party, Anmeldung).
--   Keine IP, keine Cookies. Ort (Land, Region, Stadt) kommt grob von Vercel aus der IP,
--   gespeichert wird nur der Ort. Bei angemeldeten Spielern steht das Konto dabei (nutzer).
-- admins: wer die Statistik sehen darf. Absichtlich ohne Freigaben – eintragen nur hier im
--   SQL Editor (siehe README, Schritt 5).
-- Auswertung nur über die Funktionen statistik(), konten_liste(), konto_quizze() – sie
-- prüfen selbst, ob der Aufrufer Admin ist. Lesen der Rohdaten ist niemandem erlaubt.
-- =====================================================================

create table if not exists admins (
  nutzer uuid primary key references auth.users (id) on delete cascade,
  seit   timestamptz not null default now()
);
alter table admins enable row level security;

create table if not exists ereignisse (
  id          bigint generated always as identity primary key,
  art         text not null check (art in ('besuch', 'seite', 'quiz_start', 'quiz_ende', 'party_lobby', 'anmeldung', 'registrierung')),
  nutzer      uuid default auth.uid() references auth.users (id) on delete set null,
  pfad        text check (char_length(pfad) <= 120),
  quiz        text check (char_length(quiz) <= 80),      -- Bestenlisten-Schlüssel, z. B. 'DE:kreise'
  titel       text check (char_length(titel) <= 80),
  gebiet      text check (char_length(gebiet) <= 40),
  quizart     text check (char_length(quizart) <= 20),
  quote       int  check (quote between 0 and 100),
  sekunden    int  check (sekunden between 0 and 360000),
  party       boolean not null default false,
  geraet      text check (geraet in ('handy', 'tablet', 'computer')),
  sprache     text check (char_length(sprache) <= 5),
  herkunft    text check (char_length(herkunft) <= 80),
  land        text check (char_length(land) <= 2),
  region      text check (char_length(region) <= 60),
  stadt       text check (char_length(stadt) <= 80),
  erstellt_am timestamptz not null default now()
);
create index if not exists ereignisse_zeit on ereignisse (erstellt_am);
create index if not exists ereignisse_nutzer on ereignisse (nutzer, erstellt_am);

alter table ereignisse enable row level security;
drop policy if exists "Ereignis melden" on ereignisse;
create policy "Ereignis melden" on ereignisse
  for insert to anon, authenticated
  with check (nutzer is not distinct from (select auth.uid()) and erstellt_am > now() - interval '1 minute');

create or replace function public.ist_admin()
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where nutzer = auth.uid());
$$;
revoke execute on function public.ist_admin() from public, anon;
grant execute on function public.ist_admin() to authenticated;

-- Alle Zahlen für einen Zeitraum (tage) und den gleich langen Zeitraum davor, Tage nach deutscher Zeit
create or replace function public.statistik(tage int default 30)
returns jsonb
language plpgsql stable
security definer set search_path = ''
as $$
declare
  n      int := greatest(1, least(coalesce(tage, 30), 365));
  heute  date := (now() at time zone 'Europe/Berlin')::date;
  von    timestamptz := ((heute - (n - 1))::timestamp) at time zone 'Europe/Berlin';
  vorher timestamptz := ((heute - (2 * n - 1))::timestamp) at time zone 'Europe/Berlin';
begin
  if not public.ist_admin() then
    raise exception 'Kein Zugriff' using errcode = '42501';
  end if;

  -- Ohne „with … as (…)“: daran verschluckte sich der SQL-Editor von Supabase
  return jsonb_build_object(
    'tage', n,
    'kennzahlen', (select jsonb_build_object(
        'besuche',            count(*) filter (where art = 'besuch' and erstellt_am >= von),
        'besuche_vorher',     count(*) filter (where art = 'besuch' and erstellt_am < von),
        'quiz_start',         count(*) filter (where art = 'quiz_start' and erstellt_am >= von),
        'quiz_start_vorher',  count(*) filter (where art = 'quiz_start' and erstellt_am < von),
        'quiz_ende',          count(*) filter (where art = 'quiz_ende' and not party and erstellt_am >= von),
        'quiz_allein',        count(*) filter (where art = 'quiz_start' and not party and erstellt_am >= von),
        'quote',              round(avg(quote) filter (where art = 'quiz_ende' and erstellt_am >= von)),
        'quote_vorher',       round(avg(quote) filter (where art = 'quiz_ende' and erstellt_am < von)),
        'party',              count(*) filter (where art = 'quiz_start' and party and erstellt_am >= von),
        'party_vorher',       count(*) filter (where art = 'quiz_start' and party and erstellt_am < von),
        'lobbys',             count(*) filter (where art = 'party_lobby' and erstellt_am >= von),
        'anmeldungen',        count(*) filter (where art = 'anmeldung' and erstellt_am >= von),
        'anmeldungen_vorher', count(*) filter (where art = 'anmeldung' and erstellt_am < von),
        'laender',            count(distinct land) filter (where art = 'besuch' and erstellt_am >= von),
        -- Wie viele sind dabei angemeldet? (nutzer gesetzt = mit Konto)
        'besuche_konto',      count(*) filter (where art = 'besuch' and nutzer is not null and erstellt_am >= von),
        'quiz_konto',         count(*) filter (where art = 'quiz_start' and nutzer is not null and erstellt_am >= von),
        'quiz_konto_vorher',  count(*) filter (where art = 'quiz_start' and nutzer is not null and erstellt_am < von),
        'spieler_konto',      count(distinct nutzer) filter (where art in ('quiz_start', 'quiz_ende') and erstellt_am >= von)
      ) from public.ereignisse where erstellt_am >= vorher),
    'konten', (select jsonb_build_object(
        'gesamt',     count(*),
        'neu',        count(*) filter (where created_at >= von),
        'neu_vorher', count(*) filter (where created_at >= vorher and created_at < von),
        'aktiv',      count(*) filter (where last_sign_in_at >= von)
      ) from auth.users),
    'verlauf', (select coalesce(jsonb_agg(jsonb_build_object(
          'tag', t.tag, 'besuche', coalesce(z.besuche, 0), 'quizze', coalesce(z.quizze, 0), 'quizze_konto', coalesce(z.quizze_konto, 0),
          'konten', coalesce(k.konten, 0)
        ) order by t.tag), '[]'::jsonb)
      from (select (heute - i) as tag from generate_series(0, n - 1) as i) t
      left join (
        select (erstellt_am at time zone 'Europe/Berlin')::date as tag,
               count(*) filter (where art = 'besuch') as besuche,
               count(*) filter (where art = 'quiz_start') as quizze,
               count(*) filter (where art = 'quiz_start' and nutzer is not null) as quizze_konto
        from public.ereignisse where erstellt_am >= von group by 1
      ) z on z.tag = t.tag
      left join (
        select (created_at at time zone 'Europe/Berlin')::date as tag, count(*) as konten
        from auth.users where created_at >= von group by 1
      ) k on k.tag = t.tag),
    'quizze', (select coalesce(jsonb_agg(to_jsonb(x) order by x.starts desc), '[]'::jsonb) from (
        select quiz, max(titel) as titel, max(gebiet) as gebiet, max(quizart) as quizart,
               count(*) filter (where art = 'quiz_start') as starts,
               count(*) filter (where art = 'quiz_start' and not party) as allein,
               count(*) filter (where art = 'quiz_ende' and not party) as enden,
               round(avg(quote) filter (where art = 'quiz_ende')) as quote,
               round(avg(sekunden) filter (where art = 'quiz_ende')) as sekunden
        from public.ereignisse where erstellt_am >= von and art in ('quiz_start', 'quiz_ende') and quiz is not null
        group by quiz order by 5 desc limit 60) x),
    'gebiete', (select coalesce(jsonb_agg(jsonb_build_object('gebiet', gebiet, 'anzahl', anzahl) order by anzahl desc), '[]'::jsonb) from (
        select gebiet, count(*) as anzahl from public.ereignisse where erstellt_am >= von and art = 'quiz_start' and gebiet is not null group by gebiet) g),
    'laender', (select coalesce(jsonb_agg(jsonb_build_object('land', land, 'besuche', besuche, 'quizze', quizze) order by besuche desc), '[]'::jsonb) from (
        select land, count(*) filter (where art = 'besuch') as besuche, count(*) filter (where art = 'quiz_start') as quizze
        from public.ereignisse where erstellt_am >= von and land is not null group by land) l),
    'staedte', (select coalesce(jsonb_agg(to_jsonb(s) order by s.besuche desc), '[]'::jsonb) from (
        select land, region, stadt, count(*) as besuche from public.ereignisse
        where erstellt_am >= von and art = 'besuch' and stadt is not null group by land, region, stadt order by 4 desc limit 25) s),
    'geraete',  (select coalesce(jsonb_agg(jsonb_build_object('name', geraet, 'anzahl', anzahl) order by anzahl desc), '[]'::jsonb) from (
        select geraet, count(*) as anzahl from public.ereignisse where erstellt_am >= von and art = 'besuch' and geraet is not null group by geraet) x),
    'sprachen', (select coalesce(jsonb_agg(jsonb_build_object('name', sprache, 'anzahl', anzahl) order by anzahl desc), '[]'::jsonb) from (
        select sprache, count(*) as anzahl from public.ereignisse where erstellt_am >= von and art = 'besuch' and sprache is not null group by sprache) x),
    'herkunft', (select coalesce(jsonb_agg(jsonb_build_object('name', herkunft, 'anzahl', anzahl) order by anzahl desc), '[]'::jsonb) from (
        select herkunft, count(*) as anzahl from public.ereignisse where erstellt_am >= von and art = 'besuch' and herkunft is not null
        group by herkunft order by 2 desc limit 10) x),
    'seiten', (select coalesce(jsonb_agg(jsonb_build_object('name', pfad, 'anzahl', anzahl) order by anzahl desc), '[]'::jsonb) from (
        select pfad, count(*) as anzahl from public.ereignisse where erstellt_am >= von and art in ('besuch', 'seite') and pfad is not null
        group by pfad order by 2 desc limit 15) x)
  );
end;
$$;
revoke execute on function public.statistik(int) from public, anon;
grant execute on function public.statistik(int) to authenticated;

-- Alle Konten mit Name, E-Mail, Daten und letztem Ort (nur für Admins)
create or replace function public.konten_liste()
returns jsonb
language plpgsql stable
security definer set search_path = ''
as $$
begin
  if not public.ist_admin() then
    raise exception 'Kein Zugriff' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.zuletzt desc nulls last), '[]'::jsonb) from (
    select u.id, u.email, p.name, p.avatar, u.created_at as erstellt,
           u.email_confirmed_at is not null as bestaetigt,
           greatest(u.last_sign_in_at, (select max(e.erstellt_am) from public.ereignisse e where e.nutzer = u.id)) as zuletzt,
           (select count(*) from public.ereignisse e where e.nutzer = u.id and e.art = 'quiz_ende') as quizze,
           (select round(avg(e.quote)) from public.ereignisse e where e.nutzer = u.id and e.art = 'quiz_ende') as quote,
           (select jsonb_build_object('land', e.land, 'region', e.region, 'stadt', e.stadt)
              from public.ereignisse e where e.nutzer = u.id and e.land is not null
              order by e.erstellt_am desc limit 1) as ort,
           exists (select 1 from public.admins a where a.nutzer = u.id) as admin
    from auth.users u left join public.profile p on p.id = u.id
    limit 1000) x);
end;
$$;
revoke execute on function public.konten_liste() from public, anon;
grant execute on function public.konten_liste() to authenticated;

-- Die letzten Quizze eines Kontos (nur für Admins)
create or replace function public.konto_quizze(konto uuid)
returns jsonb
language plpgsql stable
security definer set search_path = ''
as $$
begin
  if not public.ist_admin() then
    raise exception 'Kein Zugriff' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.erstellt_am desc), '[]'::jsonb) from (
    select e.art, e.quiz, coalesce(e.titel, (select s.titel from public.ereignisse s where s.quiz = e.quiz and s.titel is not null limit 1)) as titel,
           e.gebiet, e.quote, e.sekunden, e.party, e.erstellt_am
    from public.ereignisse e
    where e.nutzer = konto and e.art in ('quiz_start', 'quiz_ende')
    order by e.erstellt_am desc limit 40) x);
end;
$$;
revoke execute on function public.konto_quizze(uuid) from public, anon;
grant execute on function public.konto_quizze(uuid) to authenticated;
