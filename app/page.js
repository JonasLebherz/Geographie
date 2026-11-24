/**
 * app/page.js – Startseite: die Karte selbst (Welt), mit kurzer Erklärung und der Wahl
 * „Solo“ oder „Party“ (siehe app/karte/Willkommen.js). Von hier aus zoomt man in Kontinente,
 * Länder und Bundesländer und wählt rechts ein Quiz.
 */
import { gebietDaten } from '@/lib/gebiete';
import Erkundung from './karte/Erkundung';

export const metadata = { title: { absolute: 'Geo-Quiz' } };

export default function Startseite() {
  return <Erkundung start={gebietDaten('welt')} willkommen />;
}
