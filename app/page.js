/**
 * app/page.js – Startseite: die Karte selbst (Welt). Von hier aus zoomt man in Kontinente,
 * Länder und Bundesländer und wählt rechts ein Quiz. Erklärt wird hinter dem „?“ in der
 * Kopfleiste (components/Hilfe.js).
 */
import { gebietDaten } from '@/lib/gebiete';
import Erkundung from './karte/Erkundung';

export const metadata = { title: { absolute: 'Geo-Quiz' } };

export default function Startseite() {
  return <Erkundung start={gebietDaten('welt')} />;
}
