/**
 * lib/gebiete/quellen.js – alle Geodaten als GeoJSON, einmal geladen und gemerkt
 *
 * Läuft nur beim Bauen. Quellen:
 *  - Staaten: world-atlas (Natural Earth 1:50 Mio. und 1:110 Mio.)
 *  - Regionen aller Staaten: daten/regionen.topo.json (Natural Earth 1:10 Mio., vereinfacht)
 *  - Deutschland Länder + Kreise: daten/de.topo.json (Eurostat NUTS 2024)
 *  - Städte: daten/orte.json (Natural Earth)
 * Aufbereitet werden die Dateien in daten/ mit `npm run karten-daten`.
 */
import { feature, merge } from 'topojson-client';
import welt50 from 'world-atlas/countries-50m.json';
import welt110 from 'world-atlas/countries-110m.json';
import regionenTopo from '@/daten/regionen.topo.json';
import deTopo from '@/daten/de.topo.json';
import orteRoh from '@/daten/orte.json';
import { kennung } from '@/lib/geodaten/namen';

// Gebiete, die auf keiner Karte erscheinen (Antarktis und antarktische Inseln)
const OHNE = new Set(['AQ', 'TF', 'HM', 'GS', 'IO']);

// Staaten mit mehreren Hauptstädten in Natural Earth: diese gilt im Quiz
const HAUPTSTADT = { ZA: 'Pretoria', BO: 'Sucre', CI: 'Yamoussoukro', MM: 'Naypyidaw' };

const merker = new Map();
function gemerkt(name, berechnen) {
  if (!merker.has(name)) merker.set(name, berechnen());
  return merker.get(name);
}

/**
 * Staaten einer world-atlas-Topologie, nach Kennung zusammengefasst (Somalia + Somaliland,
 * Zypern + Nordzypern) und zu einem Umriss ohne innere Grenze verschmolzen.
 */
function staatenAus(topologie) {
  const gruppen = new Map();
  for (const geometrie of topologie.objects.countries.geometries) {
    const id = kennung(geometrie);
    if (OHNE.has(id)) continue;
    if (!gruppen.has(id)) gruppen.set(id, []);
    gruppen.get(id).push(geometrie);
  }
  const ergebnis = new Map();
  for (const [id, teile] of gruppen) ergebnis.set(id, { type: 'Feature', id, geometry: merge(topologie, teile) });
  return ergebnis;
}

/** Staaten 1:50 Mio. als Map Kennung → Feature */
export const staaten50 = () => gemerkt('staaten50', () => staatenAus(welt50));
/** Staaten 1:110 Mio. (für die Weltkarte) */
export const staaten110 = () => gemerkt('staaten110', () => staatenAus(welt110));
/** world-atlas 1:110 Mio. als Topologie (zum Verschmelzen ganzer Kontinente) */
export const welt110Topologie = () => welt110;

/** Regionen aller Staaten: Liste von Features mit properties { id, land, name, en, typ } */
export const regionen = () =>
  gemerkt('regionen', () => feature(regionenTopo, regionenTopo.objects.regionen).features.map((f) => ({ ...f, id: f.properties.id })));

/** Regionen eines Staates; für Deutschland die 16 Länder aus NUTS (passen genau zu den Kreisen) */
export function regionenVon(land) {
  return gemerkt(`regionen-${land}`, () => {
    if (land === 'DE') return deLaender();
    return regionen().filter((r) => r.properties.land === land);
  });
}

/** Deutschland: 16 Länder (NUTS 1), properties { id, name, en } */
export const deLaender = () =>
  gemerkt('de-laender', () =>
    feature(deTopo, deTopo.objects.laender).features.map((f) => ({ ...f, id: f.properties.id, properties: { ...f.properties, land: 'DE', typ: 'State' } })),
  );

/** Deutschland: 400 Kreise (NUTS 3), properties { id, land (NUTS-1-Kennung), name, en, stadt } */
export const deKreise = () =>
  gemerkt('de-kreise', () => feature(deTopo, deTopo.objects.kreise).features.map((f) => ({ ...f, id: f.properties.id })));

/**
 * Städte: { id, name, en, land, lon, lat, ew, art: 'h' (Hauptstadt) | 'r' (Hauptstadt einer
 * Region) | 'o', region (Natural-Earth-Region), nuts1, nuts3 (nur Deutschland) }
 */
export const orte = () =>
  gemerkt('orte', () =>
    orteRoh
      .map((o, i) => ({ ...o, id: `o${i}` }))
      // Staaten mit mehreren Hauptstädten: nur die festgelegte zählt als Hauptstadt
      .map((o) => (o.art === 'h' && HAUPTSTADT[o.land] && HAUPTSTADT[o.land] !== o.en ? { ...o, art: 'r' } : o)),
  );
