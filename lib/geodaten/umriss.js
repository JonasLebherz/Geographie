/**
 * lib/geodaten/umriss.js – Hilfsfunktion: Gebiet → SVG-Pfad
 *
 * Wird von allen Quizzen benutzt (Länder, später Bundesländer, Landkreise …).
 */
import { geoAzimuthalEqualArea, geoCentroid, geoPath } from 'd3-geo';

// Größe der Zeichenfläche in Pixeln (das SVG wird im Browser frei skaliert)
export const GROESSE = 300;

/**
 * Sammelt die Punkte, die d3 zeichnen will, und baut daraus einen kurzen SVG-Pfad:
 * Punkte werden auf ganze Pixel gerundet, doppelte Punkte fallen weg, und
 * Inselchen mit weniger als 3 verschiedenen Punkten (kleiner als ein Pixel)
 * werden ganz weggelassen. Das macht die Daten etwa 3- bis 5-mal kleiner,
 * ohne dass man bei 300 px einen Unterschied sieht.
 */
function pfadSammler() {
  const teile = [];
  let ring = [];

  const ringAbschliessen = () => {
    if (ring.length >= 3) teile.push('M' + ring.map((p) => p.join(',')).join('L') + 'Z');
    ring = [];
  };

  return {
    moveTo(x, y) {
      ringAbschliessen();
      ring.push([Math.round(x), Math.round(y)]);
    },
    lineTo(x, y) {
      const punkt = [Math.round(x), Math.round(y)];
      const letzter = ring[ring.length - 1];
      if (!letzter || letzter[0] !== punkt[0] || letzter[1] !== punkt[1]) ring.push(punkt);
    },
    closePath() {
      ringAbschliessen();
    },
    arc() {}, // nur für Punkte gebraucht, die es in Umrissen nicht gibt
    ergebnis() {
      ringAbschliessen();
      return teile.join('');
    },
  };
}

/** Rechnet ein GeoJSON-Gebiet in einen SVG-Pfad um, zentriert auf das Gebiet selbst. */
export function umrissPfad(gebiet) {
  // Flächentreue Azimutalprojektion mit dem Gebiet in der Mitte: So wird nichts
  // verzerrt, auch nicht im hohen Norden (Mercator würde Grönland aufblähen)
  // oder an der Datumsgrenze (Russland, Fidschi).
  const [laenge, breite] = geoCentroid(gebiet);
  const projektion = geoAzimuthalEqualArea()
    .rotate([-laenge, -breite])
    .fitExtent([[10, 10], [GROESSE - 10, GROESSE - 10]], gebiet);

  const sammler = pfadSammler();
  geoPath(projektion, sammler)(gebiet);
  return sammler.ergebnis();
}
