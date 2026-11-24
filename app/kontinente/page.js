/**
 * app/kontinente/page.js – Modus „Länder eines Kontinents“: Kontinent auf der Weltkarte wählen
 */
import Link from 'next/link';
import { KONTINENTE } from '@/lib/geodaten/kontinente';
import { weltKarte } from '@/lib/geodaten/karte';
import { Chevron } from '@/components/Symbole';
import KontinentWahl from './KontinentWahl';

export const metadata = { title: 'Länder eines Kontinents' };

export default function KontinenteSeite() {
  const welt = weltKarte();
  const laender = KONTINENTE.reduce((summe, k) => summe + k.laender.length, 0);

  return (
    <>
      <header className="seitenkopf erscheinen">
        <Link href="/" className="zurueck">
          <Chevron richtung="links" className="" />
          Quizze
        </Link>
        <h1>Länder eines Kontinents</h1>
        <p className="fakten">
          {laender} Länder auf {KONTINENTE.length} Kontinenten
        </p>
      </header>
      <KontinentWahl welt={welt} />
    </>
  );
}
