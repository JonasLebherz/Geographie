/**
 * app/freunde/page.js – Freunde: Einladungslink, Freundesliste, zur Party einladen (FreundeSeite.js)
 * Suspense, weil die Seite den Einladungslink (?von=…) aus der Adresse liest.
 */
import { Suspense } from 'react';
import FreundeSeite from './FreundeSeite';

export const metadata = { title: 'Freunde' };

export default function Freunde() {
  return (
    <Suspense fallback={<div className="freunde" aria-busy="true" />}>
      <FreundeSeite />
    </Suspense>
  );
}
