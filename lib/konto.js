'use client';
/**
 * lib/konto.js – Anmelden mit E-Mail und Passwort (Supabase Auth), Profil und Bestwerte im Konto
 *
 * Ohne Konto läuft alles wie bisher nur im Browser (localStorage). Mit Konto kommen dazu:
 *  - Profil (Tabelle „profile“): Name und Comic-Figur – auf jedem Gerät gleich
 *  - Bestwerte (Tabelle „bestwerte“): beim Anmelden mit denen im Browser zusammengeführt
 *    (je Quiz gilt der bessere), danach wird jeder neue Bestwert auch im Konto gespeichert
 * Tabellen und Regeln: supabase/schema.sql (Abschnitt „Konten“). Jeder sieht nur seine eigenen Zeilen.
 *
 * Ist Supabase nicht eingerichtet, meldet useKonto() verfuegbar = false und der Knopf
 * „Anmelden“ bleibt gesperrt.
 */
import { useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase/client';
import { BESTWERT_EREIGNIS, bestwerteLesen, bestwerteSchreiben, besser } from '@/lib/bestwerte';
import { einstellung, einstellungenBeobachten, einstellungSetzen } from '@/lib/einstellungen';

const NAME_SPEICHER = 'geo-quiz-name';
const AUS = { bereit: false, verfuegbar: false, nutzer: null, profil: null };

let stand = AUS;
const zuhoerer = new Set();
let gestartet = false;
let avatarZeit = null;

function setzen(neu) {
  stand = { ...stand, ...neu };
  zuhoerer.forEach((melden) => melden());
}

/** Einmal im Browser: Sitzung lesen (auch aus dem Link der Bestätigungs-Mail) und Änderungen verfolgen */
function starten() {
  if (gestartet || typeof window === 'undefined') return;
  gestartet = true;
  const db = supabase();
  if (!db) {
    setzen({ bereit: true, verfuegbar: false });
    return;
  }
  setzen({ verfuegbar: true });
  db.auth.onAuthStateChange((ereignis, sitzung) => {
    const nutzer = sitzung?.user ?? null;
    const neu = nutzer?.id !== stand.nutzer?.id;
    setzen({ bereit: true, nutzer, profil: nutzer ? stand.profil : null, ereignis });
    // Supabase rät, in diesem Rückruf nicht direkt weitere Abfragen zu starten
    if (nutzer && neu) setTimeout(() => abgleichen(nutzer), 0);
  });

  // Neue Bestwerte auch im Konto speichern
  window.addEventListener(BESTWERT_EREIGNIS, (e) => {
    if (!stand.nutzer) return;
    const { quiz, quote, sekunden } = e.detail;
    db.from('bestwerte').upsert({ nutzer: stand.nutzer.id, quiz, quote, sekunden, aktualisiert_am: new Date().toISOString() }).then(() => {});
  });

  // Neue Comic-Figur ins Profil übernehmen (kurz gewartet – im Editor wird viel geklickt)
  let letzterAvatar = einstellung('avatar');
  einstellungenBeobachten(() => {
    const avatar = einstellung('avatar');
    if (avatar === letzterAvatar) return;
    letzterAvatar = avatar;
    if (!stand.nutzer) return;
    clearTimeout(avatarZeit);
    avatarZeit = setTimeout(() => profilSpeichern({ avatar }), 1500);
  });
}

/** Nach dem Anmelden: Profil laden (Name, Figur) und Bestwerte in beide Richtungen zusammenführen */
async function abgleichen(nutzer) {
  const db = supabase();
  const { data: profil } = await db.from('profile').select('name, avatar').eq('id', nutzer.id).maybeSingle();
  if (profil) {
    setzen({ profil });
    if (profil.name) {
      try {
        localStorage.setItem(NAME_SPEICHER, profil.name);
      } catch {
        /* privates Fenster */
      }
    }
    if (profil.avatar && profil.avatar !== einstellung('avatar')) einstellungSetzen('avatar', profil.avatar);
    else if (!profil.avatar && einstellung('avatar')) profilSpeichern({ avatar: einstellung('avatar') });
  }

  const { data: zeilen } = await db.from('bestwerte').select('quiz, quote, sekunden');
  const lokal = bestwerteLesen();
  const imKonto = Object.fromEntries((zeilen ?? []).map((z) => [z.quiz, { quote: z.quote, sekunden: z.sekunden }]));
  const hochladen = [];
  const zusammen = { ...lokal };
  for (const [quiz, wert] of Object.entries(imKonto)) {
    if (besser(wert, zusammen[quiz])) zusammen[quiz] = wert;
  }
  for (const [quiz, wert] of Object.entries(lokal)) {
    if (besser(wert, imKonto[quiz])) hochladen.push({ nutzer: nutzer.id, quiz, quote: wert.quote, sekunden: wert.sekunden });
  }
  bestwerteSchreiben(zusammen);
  if (hochladen.length) await db.from('bestwerte').upsert(hochladen);
}

function abonnieren(melden) {
  zuhoerer.add(melden);
  starten();
  return () => zuhoerer.delete(melden);
}

/** Hook: { bereit, verfuegbar, nutzer, profil } */
export function useKonto() {
  return useSyncExternalStore(
    abonnieren,
    () => stand,
    () => AUS,
  );
}

/** Fehlermeldungen von Supabase in kurze deutsche Sätze (Schlüssel für t()) */
function meldung(fehler) {
  const text = `${fehler?.code ?? ''} ${fehler?.message ?? ''}`.toLowerCase();
  if (/invalid.login|invalid_credentials/.test(text)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/not.confirmed/.test(text)) return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
  if (/already.registered|user_already_exists/.test(text)) return 'Für diese E-Mail gibt es schon ein Konto.';
  if (/weak|password.should|at least/.test(text)) return 'Das Passwort ist zu schwach (mindestens 8 Zeichen).';
  if (/rate.limit|too.many|over_email_send_rate/.test(text)) return 'Zu viele Versuche – bitte in ein paar Minuten noch einmal.';
  if (/valid.email|email_address_invalid/.test(text)) return 'Die E-Mail-Adresse sieht nicht richtig aus.';
  return 'Das hat nicht geklappt. Bitte später noch einmal versuchen.';
}

const ziel = (pfad = '/') => `${window.location.origin}${pfad}`;

/** Anmelden. Ergebnis: { fehler } (Text für t()) oder {} */
export async function anmelden(email, passwort) {
  const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: passwort });
  return error ? { fehler: meldung(error) } : {};
}

/** Konto erstellen. Ergebnis: { fehler } oder { bestaetigen: true }, wenn erst die E-Mail bestätigt werden muss */
export async function registrieren(email, passwort, name) {
  const { data, error } = await supabase().auth.signUp({
    email: email.trim(),
    password: passwort,
    options: { emailRedirectTo: ziel('/'), data: { name: name.trim() } },
  });
  if (error) return { fehler: meldung(error) };
  // Gibt es die Adresse schon, meldet Supabase (aus Datenschutzgründen) keinen Fehler, aber ohne Identitäten
  if (data.user && !data.user.identities?.length) return { fehler: 'Für diese E-Mail gibt es schon ein Konto.' };
  return data.session ? {} : { bestaetigen: true };
}

/** Link zum Zurücksetzen des Passworts schicken (führt auf /konto, dort das neue Passwort setzen) */
export async function passwortVergessen(email) {
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: ziel('/konto') });
  return error ? { fehler: meldung(error) } : {};
}

/** Neues Passwort setzen (nach dem Link aus der Mail oder im Profil) */
export async function passwortAendern(passwort) {
  const { error } = await supabase().auth.updateUser({ password: passwort });
  return error ? { fehler: meldung(error) } : {};
}

export async function abmelden() {
  await supabase().auth.signOut();
  setzen({ nutzer: null, profil: null });
}

/** Name und/oder Figur im Profil speichern */
export async function profilSpeichern(aenderung) {
  if (!stand.nutzer) return { fehler: 'Nicht angemeldet.' };
  const { error } = await supabase()
    .from('profile')
    .upsert({ id: stand.nutzer.id, ...aenderung, aktualisiert_am: new Date().toISOString() });
  if (error) return { fehler: meldung(error) };
  setzen({ profil: { ...stand.profil, ...aenderung } });
  if (aenderung.name) {
    try {
      localStorage.setItem(NAME_SPEICHER, aenderung.name);
    } catch {
      /* privates Fenster */
    }
  }
  return {};
}

/** Konto samt Profil und Bestwerten löschen (Funktion konto_loeschen in supabase/schema.sql) */
export async function kontoLoeschen() {
  const { error } = await supabase().rpc('konto_loeschen');
  if (error) return { fehler: meldung(error) };
  await supabase().auth.signOut();
  setzen({ nutzer: null, profil: null });
  return {};
}
