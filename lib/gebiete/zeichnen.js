/**
 * lib/gebiete/zeichnen.js – Projektionen und SVG-Pfade für die Karten-Erkundung
 *
 * Jede Karte ist 1000 px breit (das SVG wird im Browser frei skaliert). Projektionen:
 *  - Welt: Equal Earth (flächentreu, vertrautes Weltbild)
 *  - Kontinent, Land, Region: flächentreue Azimutalprojektion mit dem Gebiet in der Mitte
 *
 * Liegen Teile eines Landes weit draußen (Hawaii, Kanaren, Französisch-Guayana …), kommen sie
 * wie im Atlas in **Nebenkarten** am unteren Rand – sonst wäre das Hauptland winzig.
 */
import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoDistance, geoGraticule, geoPath } from 'd3-geo';
import { pfadSammler } from '@/lib/geodaten/umriss';

export const BREITE = 1000;
const RAND = 18; // Abstand der Länder zum Kartenrand
const MIN_KLICKFLAECHE = 70; // kleinere Flächen (Pixel²) bekommen zusätzlich einen Klickpunkt
const ERDRADIUS = 6371;

export const runden1 = (wert) => Math.round(wert * 10) / 10;

/** Zeichnet ein GeoJSON-Objekt als kompakten SVG-Pfad. */
export function zeichnen(projektion, objekt, optionen = { stellen: 1, abstand: 0.6 }) {
  const sammler = pfadSammler(optionen);
  geoPath(projektion, sammler)(objekt);
  return sammler.ergebnis();
}

/** Einzelne Flächen (Polygone) einer Geometrie. */
export function polygone(geometrie) {
  if (!geometrie) return [];
  if (geometrie.type === 'Polygon') return [geometrie];
  if (geometrie.type === 'MultiPolygon') return geometrie.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }));
  return [];
}

/** Größte Teilfläche – dort sitzt der Klickpunkt, nicht im Meer zwischen den Inseln. */
export function hauptflaeche(flaechen) {
  return flaechen.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
}

/** Liegt der Punkt [Länge, Breite] in einem der Kästen [[West, Süd], [Ost, Nord]]? */
export function inKaesten([laenge, breite], kaesten) {
  return kaesten.some(([[west, sued], [ost, nord]]) => {
    const l = laenge < west ? laenge + 360 : laenge; // über die Datumsgrenze hinweg
    return l >= west && l <= ost && breite >= sued && breite <= nord;
  });
}

/** Nur die größte Fläche und Inseln, deren Mitte in einem der Kästen liegt (siehe kontinente.js). */
export function nurImKontinent(geometrie, kaesten) {
  const alle = polygone(geometrie);
  if (!alle.length) return geometrie;
  const groesste = hauptflaeche(alle);
  return {
    type: 'MultiPolygon',
    coordinates: alle.filter((p) => p === groesste || inKaesten(geoCentroid(p), kaesten)).map((p) => p.coordinates),
  };
}

/** Projektion auf die Breite einpassen und so verschieben, dass oben links (rand, rand) liegt. Gibt die Höhe zurück. */
export function einpassen(projektion, objekt, rand = RAND) {
  projektion.fitWidth(BREITE - 2 * rand, objekt);
  const [[x0, y0], [, y1]] = geoPath(projektion).bounds(objekt);
  const [tx, ty] = projektion.translate();
  projektion.translate([tx - x0 + rand, ty - y0 + rand]);
  return Math.round(y1 - y0 + 2 * rand);
}

/** Azimutalprojektion mit dem Punkt [Länge, Breite] in der Mitte (nur die Halbkugel darum) */
export function azimutal(mitte) {
  return geoAzimuthalEqualArea().rotate([-mitte[0], -mitte[1]]).clipAngle(90);
}

/**
 * Projektion für ein Land oder eine Region: Einpassen auf den Hauptteil, weit entfernte
 * Einheiten (Bundesstaaten, Provinzen …) kommen in Nebenkarten unter die Hauptkarte.
 *
 * einheiten: Features der Einheiten (z. B. Regionen des Landes)
 * Ergebnis: { haupt, hoehe, hauptHoehe, nebenkarten: [{ x, y, b, h }], projektionVon(id) }
 *
 * Welche Einheiten zusammengehören, entscheidet eine Gruppierung: Zwei Einheiten hängen
 * zusammen, wenn der Abstand ihrer Mitten abzüglich ihrer Größe (Radius eines gleich großen
 * Kreises) unter 600 km liegt. So bleibt ein Inselstaat wie Indonesien zusammen, während
 * Hawaii, Alaska, die Kanaren oder die französischen Überseegebiete eigene Gruppen bilden.
 * Die Gruppe mit der größten Fläche ist die Hauptkarte, alle anderen werden Nebenkarten.
 */
export function landProjektion(einheiten, { nebenkartenErlaubt = true } = {}) {
  const VERBINDUNG = 600 / ERDRADIUS;
  const info = einheiten
    .filter((e) => polygone(e.geometry).length)
    .map((e) => {
      const flaeche = geoArea(e);
      return { e, mitte: geoCentroid(hauptflaeche(polygone(e.geometry))), radius: Math.sqrt(flaeche / Math.PI), flaeche };
    });

  // Gruppieren (Union-Find): jede Verbindung legt zwei Gruppen zusammen
  const gruppeVon = info.map((_, i) => i);
  const wurzel = (i) => (gruppeVon[i] === i ? i : (gruppeVon[i] = wurzel(gruppeVon[i])));
  for (let i = 0; i < info.length; i += 1) {
    for (let j = i + 1; j < info.length; j += 1) {
      const a = info[i];
      const b = info[j];
      if (geoDistance(a.mitte, b.mitte) - a.radius - b.radius <= VERBINDUNG) gruppeVon[wurzel(i)] = wurzel(j);
    }
  }
  const gruppenMap = new Map();
  info.forEach((x, i) => {
    const w = wurzel(i);
    if (!gruppenMap.has(w)) gruppenMap.set(w, { einheiten: [], flaeche: 0 });
    gruppenMap.get(w).einheiten.push(x);
    gruppenMap.get(w).flaeche += x.flaeche;
  });
  const alleGruppen = [...gruppenMap.values()].sort((a, b) => b.flaeche - a.flaeche);
  const hauptGruppe = nebenkartenErlaubt ? alleGruppen[0].einheiten : info;
  const fernGruppen = nebenkartenErlaubt ? alleGruppen.slice(1) : [];

  // Hauptkarte: Teile einer Einheit, die weit von ihr weg liegen (z. B. die Osterinsel bei
  // Valparaíso), zählen fürs Einpassen nicht – sie liegen dann außerhalb und werden abgeschnitten
  const hauptTeile = {
    type: 'GeometryCollection',
    geometries: hauptGruppe.map(({ e, mitte, radius }) => ({
      type: 'MultiPolygon',
      coordinates: polygone(e.geometry)
        .filter((p) => geoDistance(geoCentroid(p), mitte) <= radius + 1000 / ERDRADIUS)
        .map((p) => p.coordinates),
    })),
  };
  const haupt = azimutal(geoCentroid(hauptTeile));
  let hoehe = einpassen(haupt, hauptTeile);
  // Sehr hohe Gebiete (Chile, Norwegen …) nicht endlos hoch: höchstens 1,6 × Breite
  if (hoehe > BREITE * 1.6) {
    const faktor = (BREITE * 1.6) / hoehe;
    haupt.scale(haupt.scale() * faktor);
    const [[x0, y0], [x1, y1]] = geoPath(haupt).bounds(hauptTeile);
    const [tx, ty] = haupt.translate();
    haupt.translate([tx - x0 + (BREITE - (x1 - x0)) / 2, ty - y0 + RAND]);
    hoehe = Math.round(BREITE * 1.6);
  }
  const hauptHoehe = hoehe;
  haupt.clipExtent([[0, 0], [BREITE, hauptHoehe]]);

  // Nebenkarten: je ferne Gruppe eine (z. B. Kanaren, Hawaii); höchstens 12, die größten zuerst
  const gruppen = fernGruppen.slice(0, 12).map((g) => ({ einheiten: g.einheiten.map((x) => x.e) }));
  const nebenkarten = [];
  const projektionen = new Map();
  if (gruppen.length) {
    const proZeile = Math.min(gruppen.length, 6);
    const abstand = 12;
    const groesse = Math.min(180, (BREITE - 2 * RAND - (proZeile - 1) * abstand) / proZeile);
    gruppen.forEach((g, i) => {
      const x = RAND + (i % proZeile) * (groesse + abstand);
      const y = hauptHoehe + abstand + Math.floor(i / proZeile) * (groesse + abstand);
      const objekt = { type: 'FeatureCollection', features: g.einheiten };
      const p = azimutal(geoCentroid(objekt)).fitExtent([[x + 10, y + 10], [x + groesse - 10, y + groesse - 10]], objekt);
      p.clipExtent([[x, y], [x + groesse, y + groesse]]);
      const kasten = { x: runden1(x), y: runden1(y), b: runden1(groesse), h: runden1(groesse) };
      nebenkarten.push({ ...kasten, projektion: p });
      for (const e of g.einheiten) projektionen.set(e.id, p);
    });
    const zeilen = Math.ceil(gruppen.length / proZeile);
    hoehe = Math.round(hauptHoehe + zeilen * (groesse + abstand) + RAND);
  }

  return { haupt, hoehe, hauptHoehe, nebenkarten, projektionVon: (id) => projektionen.get(id) ?? haupt };
}

/**
 * Eine Einheit (Fläche) zeichnen: Pfad, Klickpunkt für kleine Flächen, Mitte für den Aufdeck-Ring.
 * punkt: fester Ort statt der Flächenmitte (z. B. Tuvalu, das in den Daten fehlt)
 */
export function flaecheZeichnen(projektion, feature, { optionen, punkt: fester } = {}) {
  const pfad = feature ? zeichnen(projektion, feature, optionen) : '';
  const mass = geoPath(projektion);
  const ort = fester ? projektion(fester) : feature ? mass.centroid(hauptflaeche(polygone(feature.geometry))) : null;
  const mitte = ort && Number.isFinite(ort[0]) ? ort.map(runden1) : null;
  const klein = fester || !pfad || mass.area(feature) < MIN_KLICKFLAECHE;
  return { pfad, punkt: klein ? mitte : null, mitte };
}

/** Punkt (Stadt) projizieren; null, wenn er außerhalb der Karte liegt */
export function punktZeichnen(projektion, lonLat, breite, hoehe) {
  const p = projektion(lonLat);
  if (!p || !Number.isFinite(p[0])) return null;
  if (p[0] < 0 || p[1] < 0 || p[0] > breite || p[1] > hoehe) return null;
  return p.map(runden1);
}

/** Längen- und Breitengrade alle 10° */
export function gradnetz(projektion) {
  return zeichnen(projektion, geoGraticule().step([10, 10]).extentMajor([[-180, -80], [180, 80]])(), { stellen: 0, abstand: 2 });
}
