'use client';
/**
 * lib/statistik.js – meldet anonyme Ereignisse für die Statistik (Seite /statistik)
 *
 *   melden('besuch' | 'seite' | 'quiz_start' | 'quiz_ende' | 'party_lobby' | 'anmeldung' | 'registrierung', daten)
 *
 * Geht an /api/ereignis (der Server ergänzt den groben Ort, nie die IP). Keine Cookies, keine
 * Kennung im Browser. Angemeldet: Zugangsschlüssel dazu, dann zählt es für das Konto.
 * Admins (Merker geo-quiz-admin, gesetzt in lib/konto.js) werden nicht gezählt, die Seite
 * /statistik selbst auch nicht. Ohne Supabase passiert nichts.
 */
import { supabase } from '@/lib/supabase/client';

export const ADMIN_MERKER = 'geo-quiz-admin';

function zaehlen() {
  if (typeof window === 'undefined' || !supabase()) return false;
  if (window.location.pathname.startsWith('/statistik')) return false;
  try {
    return localStorage.getItem(ADMIN_MERKER) !== '1';
  } catch {
    return true;
  }
}

/** Grobe Geräteart nach Fensterbreite und Zeiger */
export function geraet() {
  const breite = Math.min(window.screen?.width ?? window.innerWidth, window.innerWidth);
  if (breite < 640) return 'handy';
  if (breite < 1100 && window.matchMedia('(pointer: coarse)').matches) return 'tablet';
  return 'computer';
}

/** Pfad ohne Persönliches: Party-Codes werden zu „/party/…“ */
export function pfadOhneCode(pfad) {
  return pfad.replace(/^\/party\/[^/]+/, '/party/…').slice(0, 120);
}

export function melden(art, daten = {}) {
  if (!zaehlen()) return;
  (async () => {
    let token = null;
    try {
      const { data } = await supabase().auth.getSession();
      token = data.session?.access_token ?? null;
    } catch {
      /* ohne Konto */
    }
    fetch('/api/ereignis', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ art, ...daten }),
    }).catch(() => {});
  })();
}
