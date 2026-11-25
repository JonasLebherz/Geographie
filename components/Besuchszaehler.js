'use client';
/**
 * components/Besuchszaehler.js – zählt einen Besuch je Seitenaufruf und danach jeden
 * Seitenwechsel (lib/statistik.js). Zeichnet nichts.
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { einstellung } from '@/lib/einstellungen';
import { geraet, melden, pfadOhneCode } from '@/lib/statistik';

let besuchGemeldet = false;

/** Woher kommt der Besuch? Nur der Name einer fremden Seite (z. B. „google.com“) */
function herkunft() {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname.replace(/^www\./, '');
    return host && host !== window.location.hostname ? host : null;
  } catch {
    return null;
  }
}

export default function Besuchszaehler() {
  const pfad = usePathname();
  const letzter = useRef(null);

  useEffect(() => {
    const sauber = pfadOhneCode(pfad);
    if (!besuchGemeldet) {
      besuchGemeldet = true;
      letzter.current = sauber;
      melden('besuch', { pfad: sauber, geraet: geraet(), sprache: einstellung('sprache'), herkunft: herkunft() });
      return;
    }
    if (sauber !== letzter.current) {
      letzter.current = sauber;
      melden('seite', { pfad: sauber });
    }
  }, [pfad]);

  return null;
}
