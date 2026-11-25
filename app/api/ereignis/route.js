/**
 * app/api/ereignis/route.js – nimmt Statistik-Ereignisse an (lib/statistik.js) und speichert sie
 * in der Supabase-Tabelle „ereignisse“ (supabase/schema.sql)
 *
 * Läuft auf dem Server, weil nur hier der grobe Ort bekannt ist: Vercel schreibt ihn aus der
 * IP-Adresse in die Kopfzeilen x-vercel-ip-country / -country-region / -city. Gespeichert wird
 * nur der Ort, nie die IP. Ist der Spieler angemeldet, schickt der Browser seinen Zugangsschlüssel
 * mit – dann trägt Supabase das Konto ein (Spalte nutzer = auth.uid()). Bots werden nicht gezählt.
 */
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ARTEN = new Set(['besuch', 'seite', 'quiz_start', 'quiz_ende', 'party_lobby', 'anmeldung', 'registrierung']);
const GERAETE = new Set(['handy', 'tablet', 'computer']);
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|whatsapp|telegram/i;

const text = (wert, laenge) => (typeof wert === 'string' && wert.trim() ? wert.trim().slice(0, laenge) : null);
const zahl = (wert, min, max) => (Number.isFinite(wert) ? Math.min(max, Math.max(min, Math.round(wert))) : null);

function ortAus(kopf) {
  const lesen = (name) => {
    const wert = kopf.get(name);
    if (!wert) return null;
    try {
      return decodeURIComponent(wert);
    } catch {
      return wert;
    }
  };
  const land = lesen('x-vercel-ip-country');
  return {
    land: land && /^[A-Z]{2}$/.test(land) ? land : null,
    region: text(lesen('x-vercel-ip-country-region'), 60),
    stadt: text(lesen('x-vercel-ip-city'), 80),
  };
}

export async function POST(anfrage) {
  const leer = new Response(null, { status: 204 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const schluessel = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !schluessel) return leer;
  if (BOT.test(anfrage.headers.get('user-agent') ?? '')) return leer;

  let d;
  try {
    const roh = await anfrage.text();
    if (roh.length > 2000) return leer;
    d = JSON.parse(roh);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!ARTEN.has(d?.art)) return new Response(null, { status: 400 });

  const zeile = {
    art: d.art,
    pfad: text(d.pfad, 120),
    quiz: text(d.quiz, 80),
    titel: text(d.titel, 80),
    gebiet: text(d.gebiet, 40),
    quizart: text(d.quizart, 20),
    quote: zahl(d.quote, 0, 100),
    sekunden: zahl(d.sekunden, 0, 360000),
    party: d.party === true,
    geraet: GERAETE.has(d.geraet) ? d.geraet : null,
    sprache: text(d.sprache, 5),
    herkunft: text(d.herkunft, 80),
    ...ortAus(anfrage.headers),
  };

  const eintragen = (token) =>
    createClient(url, schluessel, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: token ? { headers: { Authorization: token } } : undefined,
    })
      .from('ereignisse')
      .insert(zeile);

  const token = anfrage.headers.get('authorization');
  let { error } = await eintragen(/^Bearer [\w.-]+$/.test(token ?? '') ? token : null);
  // Abgelaufener Schlüssel o. Ä.: dann eben ohne Konto zählen
  if (error && token) ({ error } = await eintragen(null));
  if (error) console.error('Statistik:', error.message);
  return leer;
}
