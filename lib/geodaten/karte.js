/**
 * lib/geodaten/karte.js – Karten für den Modus „Länder eines Kontinents“
 *
 *  weltKarte()          → die Weltkarte zum Auswählen, ein Pfad je Kontinent
 *  kontinentKarte(slug) → ein Kontinent groß: jedes gefragte Land als eigener Pfad,
 *                         alles andere im Ausschnitt als graue Umgebung
 *
 * Läuft nur beim Bauen (npm run build), die Ergebnisse landen fertig in der Seite.
 * Quelle: world-atlas (Natural Earth, gemeinfrei) – Weltkarte 1:110 Mio., Kontinente 1:50 Mio.
 */
import { merge } from 'topojson-client';
import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoEqualEarth, geoGraticule, geoPath } from 'd3-geo';
import welt50 from 'world-atlas/countries-50m.json';
import welt110 from 'world-atlas/countries-110m.json';
import { KONTINENTE, kontinentFinden } from './kontinente';
import { deutscherName, kennung } from './namen';
import { pfadSammler } from './umriss';

// Breite der Zeichenfläche in Pixeln; das SVG wird im Browser frei skaliert
export const KARTEN_BREITE = 1000;

// Abstand der Länder zum Kartenrand (Pixel), wenn die Karte auf die Länder eingepasst wird
const RAND = 18;

// Gebiete, die auf keiner Karte erscheinen (Antarktis und antarktische Inseln)
const OHNE = new Set(['AQ', 'TF', 'HM', 'GS', 'IO']);

// Länder, deren Fläche auf der Karte kleiner ist als das (in Pixel²), bekommen
// zusätzlich einen runden Punkt zum Anklicken (Malta, Karibikinseln, Pazifikstaaten …)
const MIN_KLICKFLAECHE = 70;

const runden1 = (wert) => Math.round(wert * 10) / 10;

/**
 * Fasst die Gebiete einer Topologie nach Kennung zusammen (z. B. Somalia + Somaliland,
 * Zypern + Nordzypern) und verschmilzt sie zu einem Umriss ohne innere Grenze.
 * Ergebnis: Map Kennung → GeoJSON-Feature.
 */
function gebieteNachKennung(topologie) {
  const gruppen = new Map();
  for (const geometrie of topologie.objects.countries.geometries) {
    const id = kennung(geometrie);
    if (OHNE.has(id)) continue;
    if (!gruppen.has(id)) gruppen.set(id, []);
    gruppen.get(id).push(geometrie);
  }
  const ergebnis = new Map();
  for (const [id, teile] of gruppen) {
    ergebnis.set(id, { type: 'Feature', id, geometry: merge(topologie, teile) });
  }
  return ergebnis;
}

/** Zeichnet ein GeoJSON-Objekt mit der Projektion als kompakten SVG-Pfad. */
function zeichnen(projektion, objekt, optionen) {
  const sammler = pfadSammler(optionen);
  geoPath(projektion, sammler)(objekt);
  return sammler.ergebnis();
}

/** Einzelne Flächen (Polygone) einer Geometrie. */
function polygone(geometrie) {
  if (geometrie.type === 'Polygon') return [geometrie];
  return geometrie.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }));
}

/** Größte Teilfläche – dort sitzt der Klickpunkt, nicht im Meer zwischen den Inseln. */
function hauptflaeche(flaechen) {
  return flaechen.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
}

/** Liegt der Punkt [Länge, Breite] in einem der Kästen [[West, Süd], [Ost, Nord]]? */
function inKaesten([laenge, breite], kaesten) {
  return kaesten.some(([[west, sued], [ost, nord]]) => {
    const l = laenge < west ? laenge + 360 : laenge; // Ozeanien liegt über der Datumsgrenze
    return l >= west && l <= ost && breite >= sued && breite <= nord;
  });
}

/**
 * Nur die Teile, die zum Kontinent gehören (siehe `teile` in kontinente.js): die größte
 * Fläche und jede Insel, deren Mitte in einem der Kästen liegt. So erscheint z. B.
 * Französisch-Guayana (Teil Frankreichs) nicht als Teil Europas, und Hawaii zählt nicht
 * zum Ausschnitt Nordamerikas.
 */
function nurImKontinent(geometrie, kaesten) {
  const alle = polygone(geometrie);
  const groesste = hauptflaeche(alle);
  return {
    type: 'MultiPolygon',
    coordinates: alle.filter((p) => p === groesste || inKaesten(geoCentroid(p), kaesten)).map((p) => p.coordinates),
  };
}

/**
 * Karte eines Kontinents.
 * Ergebnis: { slug, name, breite, hoehe, laender: [{ id, name, pfad, punkt, mitte }], umland, netz }
 *  - laender: die gefragten Staaten. punkt = [x, y] des Klickpunkts für kleine Länder, sonst null.
 *             mitte = [x, y] der Hauptfläche (dort erscheint der Ring beim Aufdecken).
 *  - umland:  alle übrigen Gebiete im Ausschnitt als ein einziger Pfad (nicht anklickbar)
 *  - netz:    Längen- und Breitengrade alle 10°
 */
export function kontinentKarte(slug) {
  const kontinent = kontinentFinden(slug);
  if (!kontinent) return null;
  const { mitte, laender, teile, einpassen: sonder = {}, punkte = {} } = kontinent;
  const gebiete = gebieteNachKennung(welt50);

  // Eingepasst wird auf die gefragten Länder (nur ihre Teile im Kontinent) samt Klickpunkten.
  // Ausnahmen aus kontinente.js: Länder ohne (Russland) und stattdessen feste Punkte.
  const ohne = new Set(sonder.ohne ?? []);
  const einpassen = {
    type: 'GeometryCollection',
    geometries: [
      ...laender
        .filter((id) => gebiete.has(id) && !ohne.has(id))
        .map((id) => nurImKontinent(gebiete.get(id).geometry, teile)),
      { type: 'MultiPoint', coordinates: [...Object.values(punkte), ...(sonder.punkte ?? [])] },
    ],
  };
  const rand = RAND;

  // Flächentreue Azimutalprojektion mit dem Kontinent in der Mitte, eingepasst auf die Breite.
  // clipAngle(90): nur die Halbkugel um die Mitte – die Rückseite der Erde würde sonst riesig verzerrt.
  const projektion = geoAzimuthalEqualArea()
    .rotate([-mitte[0], -mitte[1]])
    .clipAngle(90)
    .fitWidth(KARTEN_BREITE - 2 * rand, einpassen);
  const [[x0, y0], [, y1]] = geoPath(projektion).bounds(einpassen);
  const [tx, ty] = projektion.translate();
  projektion.translate([tx - x0 + rand, ty - y0 + rand]);
  const hoehe = Math.round(y1 - y0 + 2 * rand);
  // Alles außerhalb der Zeichenfläche abschneiden (z. B. Französisch-Guayana, das zu Frankreich gehört)
  projektion.clipExtent([[0, 0], [KARTEN_BREITE, hoehe]]);

  const mass = geoPath(projektion);
  const gefragt = new Set(laender);
  const optionen = { stellen: 1, abstand: 0.6 };

  const liste = laender.map((id) => {
    const gebiet = gebiete.get(id);
    const pfad = gebiet ? zeichnen(projektion, gebiet, optionen) : '';
    const ort = punkte[id] ? projektion(punkte[id]) : mass.centroid(hauptflaeche(polygone(gebiet.geometry)));
    const mitte = ort && Number.isFinite(ort[0]) ? ort.map(runden1) : null;
    const klein = punkte[id] || !pfad || mass.area(gebiet) < MIN_KLICKFLAECHE;
    const punkt = klein ? mitte : null;
    if (!pfad && !punkt) throw new Error(`${kontinent.name}: ${id} liegt nicht im Ausschnitt`);
    return { id, name: deutscherName(id), pfad, punkt, mitte };
  });
  liste.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  // Umgebung: alles Übrige, als ein Pfad (Ringe bleiben getrennt, Grenzen also sichtbar)
  const umland = [...gebiete.values()]
    .filter((gebiet) => !gefragt.has(gebiet.id))
    .map((gebiet) => zeichnen(projektion, gebiet, optionen))
    .join('');

  const netz = zeichnen(projektion, geoGraticule().step([10, 10]).extentMajor([[-180, -80], [180, 80]])(), {
    stellen: 0,
    abstand: 2,
  });

  return { slug, name: kontinent.name, breite: KARTEN_BREITE, hoehe, laender: liste, umland, netz };
}

/**
 * Weltkarte zur Auswahl des Kontinents (Equal-Earth-Projektion, flächentreu).
 * Ergebnis: { breite, hoehe, kontinente: [{ slug, name, anzahl, pfad, beschriftung: [x, y] }] }
 * grob: weniger Punkte (für kleine Vorschaubilder, z. B. im Hauptmenü)
 */
export function weltKarte({ grob = false } = {}) {
  const gebiete = gebieteNachKennung(welt110);
  const projektion = geoEqualEarth().rotate([-10, 0]);
  const land = { type: 'FeatureCollection', features: [...gebiete.values()] };
  projektion.fitWidth(KARTEN_BREITE, land);
  const [[x0, y0], [, y1]] = geoPath(projektion).bounds(land);
  const [tx, ty] = projektion.translate();
  projektion.translate([tx - x0, ty - y0]);

  const kontinente = KONTINENTE.map((kontinent) => {
    const ids = new Set([...kontinent.laender, ...kontinent.umgebung]);
    const teile = welt110.objects.countries.geometries.filter((g) => ids.has(kennung(g)));
    const flaeche = nurImKontinent(merge(welt110, teile), kontinent.teile);
    return {
      slug: kontinent.slug,
      name: kontinent.name,
      anzahl: kontinent.laender.length,
      pfad: zeichnen(projektion, flaeche, grob ? { stellen: 0, abstand: 3 } : { stellen: 1, abstand: 0.8 }),
      beschriftung: projektion(kontinent.beschriftung).map(runden1),
    };
  });

  return { breite: KARTEN_BREITE, hoehe: Math.round(y1 - y0), kontinente };
}
