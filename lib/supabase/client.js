/**
 * lib/supabase/client.js – Zugang zu Supabase (vorbereitet, noch nicht benutzt)
 *
 * Gedacht für später, z. B. Bestenlisten oder Benutzerkonten.
 * Die Quizze selbst brauchen Supabase NICHT: Die Geodaten werden fest mit
 * der Seite ausgeliefert.
 *
 * Die Werte kommen aus .env.local (lokal) bzw. den Environment Variables bei Vercel.
 * Fehlen sie, liefert supabase() einfach null und die Seite läuft trotzdem.
 */
import { createClient } from '@supabase/supabase-js';

let verbindung;

export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const schluessel = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !schluessel) return null;

  verbindung ??= createClient(url, schluessel);
  return verbindung;
}
