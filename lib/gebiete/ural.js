/**
 * lib/gebiete/ural.js – Russland geteilt: der europäische Teil (bis Ural und Uralfluss) gehört
 * zu Europa, der asiatische (Sibirien, Ferner Osten) zu Asien
 *
 * Die Grenze folgt grob der üblichen Kontinentgrenze: Karasee östlich von Nowaja Semlja →
 * Ural-Kamm → Uralfluss → Kaspisches Meer → Kaukasus (die Südgrenze Russlands). Nowaja Semlja,
 * Franz-Josef-Land, Kaliningrad und der Nordkaukasus liegen damit in Europa.
 *
 * russlandTeil(feature, 'europa' | 'asien') schneidet ein Russland-Feature zu (polygon-clipping,
 * eben in Länge/Breite – genau genug für Karten in diesem Maßstab) und dreht die Ringe so, wie
 * d3 sie erwartet. inEuropa(lon, lat) entscheidet für Orte in Russland (Städte, Gipfel …).
 */
import polygonClipping from 'polygon-clipping';
import { geoArea } from 'd3-geo';

/** Europäisches Russland: Fläche westlich der Grenze (Ring Länge/Breite, gegen den Uhrzeigersinn) */
export const EUROPA_GRENZE = [
  [10, 38], [52, 38], [49.5, 44], [51.9, 47.1], [52.5, 50.6], [55.5, 50.6], [59, 51.2],
  [59.5, 55], [59.1, 58], [59.5, 62], [60.7, 65], [64.5, 67.6], [66.6, 69], [61.5, 70.5], [62, 73], [70, 77], [72, 85],
  [10, 85], [10, 38],
];

/** Liegt ein Punkt im europäischen Teil? (Strahlverfahren) */
export function inEuropa(lon, lat) {
  let innen = false;
  const r = EUROPA_GRENZE;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) innen = !innen;
  }
  return innen;
}

/** Ringe so drehen, dass d3 die Fläche als „innen“ versteht (sonst wäre es die ganze Erde ohne sie) */
function fuerD3(polygone) {
  return polygone.map((polygon) =>
    geoArea({ type: 'Polygon', coordinates: polygon }) > 2 * Math.PI ? polygon.map((ring) => [...ring].reverse()) : polygon,
  );
}

/**
 * Koordinaten als Liste von Polygonen. Russlands Festland läuft über die Datumsgrenze
 * (Tschukotka mit negativer Länge) – eben gerechnet wäre das ein Ring rund um die Erde. Darum
 * werden Längen westlich von −100° um 360° verschoben (190° statt −170°), d3 zeichnet das genauso.
 */
const koordinaten = (geometrie) =>
  (geometrie.type === 'Polygon' ? [geometrie.coordinates] : geometrie.coordinates).map((polygon) =>
    polygon.map((ring) => ring.map(([lon, lat]) => [lon < -100 ? lon + 360 : lon, lat])),
  );

/** Europäischer bzw. asiatischer Teil eines Russland-Features */
export function russlandTeil(feature, teil) {
  const grenze = [[EUROPA_GRENZE]];
  const ergebnis =
    teil === 'europa'
      ? polygonClipping.intersection(koordinaten(feature.geometry), grenze)
      : polygonClipping.difference(koordinaten(feature.geometry), grenze);
  return { ...feature, geometry: { type: 'MultiPolygon', coordinates: fuerD3(ergebnis) } };
}

/** Zwei Geometrien vereinigen (für die Kontinentflächen der Weltkarte) */
export function vereinigen(a, b) {
  return { type: 'MultiPolygon', coordinates: fuerD3(polygonClipping.union(koordinaten(a), koordinaten(b))) };
}
