/**
 * app/freunde/page.js – Freunde-Bereich (Vorschau): Freundesliste, Chat, Einladen
 * Noch ohne Datenbank – alles bleibt im Browser (FreundeSeite.js).
 */
import FreundeSeite from './FreundeSeite';

export const metadata = { title: 'Freunde' };

export default function Freunde() {
  return <FreundeSeite />;
}
