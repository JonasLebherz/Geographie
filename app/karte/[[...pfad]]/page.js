/**
 * app/karte/[[...pfad]]/page.js – Karten-Erkundung, z. B. /karte, /karte/europa/deutschland/bayern
 *
 * Für jedes Gebiet wird beim Bauen eine Seite erzeugt (Direktlinks, Teilen). Sie bringt die
 * Karte ihres Gebiets gleich mit; alles Weitere lädt die Erkundung im Browser nach
 * (/karte-daten/…) und wechselt die Gebiete ohne Neuladen – mit Kamerafahrt.
 */
import { notFound } from 'next/navigation';
import { alleKnoten, gebietDaten, knotenZuPfad, urlPfad } from '@/lib/gebiete';
import Erkundung from '../Erkundung';

export const dynamicParams = false;

export function generateStaticParams() {
  return alleKnoten().map((id) => ({ pfad: urlPfad(id) }));
}

export async function generateMetadata({ params }) {
  const knoten = knotenZuPfad((await params).pfad ?? []);
  return { title: knoten ? (knoten.ebene === 'welt' ? 'Karte' : `Karte · ${knoten.name}`) : undefined };
}

export default async function KartenSeite({ params }) {
  const knoten = knotenZuPfad((await params).pfad ?? []);
  if (!knoten) notFound();
  return <Erkundung start={gebietDaten(knoten.id)} />;
}
