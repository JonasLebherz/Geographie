'use client';
/**
 * lib/freunde.js – Freunde und Party-Einladungen über Supabase (Tabellen und Funktionen in
 * supabase/schema.sql, Abschnitt „Freunde und Party-Einladungen“)
 *
 * Freund werden: Der eigene Einladungslink ist /freunde?von=<Konto-Kennung>. Wer ihn öffnet und
 * annimmt, ist mit dem Absender befreundet (freund_hinzufuegen legt beide Richtungen an).
 * Einladen: eine Zeile in „einladungen“ (nur an Freunde, prüft die Datenbank). Der Eingeladene
 * bekommt sie sofort über Realtime und zur Sicherheit alle 30 s per Abfrage (components/Einladungen.js).
 * Alle Funktionen liefern { fehler } (Text für t()) oder ihr Ergebnis.
 */
import { supabase } from '@/lib/supabase/client';

const db = () => supabase();
const FEHLER = 'Das hat nicht geklappt. Bitte später noch einmal versuchen.';

export const einladungslink = (kontoId) => `${window.location.origin}/freunde?von=${kontoId}`;

export async function profilOeffentlich(kontoId) {
  const { data, error } = await db().rpc('profil_oeffentlich', { konto: kontoId });
  return error ? { fehler: FEHLER } : { profil: data };
}

export async function freundeLaden() {
  const { data, error } = await db().rpc('meine_freunde');
  return error ? { fehler: FEHLER, freunde: [] } : { freunde: data ?? [] };
}

export async function freundHinzufuegen(kontoId) {
  const { error } = await db().rpc('freund_hinzufuegen', { konto: kontoId });
  return error ? { fehler: FEHLER } : {};
}

export async function freundEntfernen(kontoId) {
  const { error } = await db().rpc('freund_entfernen', { konto: kontoId });
  return error ? { fehler: FEHLER } : {};
}

/** Freund in eine Party (Lobby-Code) einladen */
export async function einladen(an, party) {
  const { error } = await db().from('einladungen').insert({ an, party });
  return error ? { fehler: FEHLER } : {};
}

export async function einladungenLaden() {
  const { data, error } = await db().rpc('meine_einladungen');
  return error ? { einladungen: [] } : { einladungen: data ?? [] };
}

export async function einladungGesehen(id) {
  await db().from('einladungen').update({ gesehen: true }).eq('id', id);
}

/** Neue Einladungen sofort melden (Realtime). Liefert die Abmelde-Funktion. */
export function einladungenAbonnieren(kontoId, melden) {
  const kanal = db()
    .channel(`einladungen-${kontoId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'einladungen', filter: `an=eq.${kontoId}` }, () => melden())
    .subscribe();
  return () => {
    db().removeChannel(kanal);
  };
}
