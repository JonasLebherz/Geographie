/**
 * app/karte-daten/[knoten]/[datei]/route.js – Kartendaten als statische JSON-Dateien
 *
 *   /karte-daten/<knoten>/gebiet.json   Karte zum Weiterklicken (gebietDaten)
 *   /karte-daten/<knoten>/<satz>.json   Spieldaten eines Quiz-Satzes (satzDaten)
 *
 * Alle Dateien entstehen beim Bauen (generateStaticParams + force-static) und liegen dann
 * fertig auf Vercel. Zur Laufzeit wird nichts berechnet.
 */
import { alleKnoten, baum, gebietDaten, saetze, satzDaten } from '@/lib/gebiete';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return alleKnoten().flatMap((knoten) => [
    { knoten, datei: 'gebiet.json' },
    ...saetze(baum().get(knoten))
      .filter((s) => !s.wieKarte)
      .map((s) => ({ knoten, datei: `${s.id}.json` })),
  ]);
}

export async function GET(_anfrage, { params }) {
  const { knoten, datei } = await params;
  const name = datei.replace(/\.json$/, '');
  const daten = name === 'gebiet' ? gebietDaten(knoten) : satzDaten(knoten, name);
  if (!daten) return new Response('Nicht gefunden', { status: 404 });
  return Response.json(daten);
}
