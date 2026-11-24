/**
 * app/kontinente/[kontinent]/page.js – Spiel „Länder eines Kontinents“, z. B. /kontinente/europa
 *
 * Wird beim Bauen für jeden Kontinent fertig erzeugt (generateStaticParams): Die Karte
 * mit allen Ländern wird dabei berechnet und als Pfade in die Seite geschrieben.
 */
import { notFound } from 'next/navigation';
import { KONTINENTE, kontinentFinden } from '@/lib/geodaten/kontinente';
import { kontinentKarte } from '@/lib/geodaten/karte';
import KontinentSpiel from './KontinentSpiel';

export const dynamicParams = false;

export function generateStaticParams() {
  return KONTINENTE.map((k) => ({ kontinent: k.slug }));
}

export async function generateMetadata({ params }) {
  const kontinent = kontinentFinden((await params).kontinent);
  return { title: kontinent ? `Länder in ${kontinent.name}` : undefined };
}

export default async function KontinentSeite({ params }) {
  const karte = kontinentKarte((await params).kontinent);
  if (!karte) notFound();
  return <KontinentSpiel karte={karte} />;
}
