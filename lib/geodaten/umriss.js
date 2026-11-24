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
 * Punkte werden gerundet (stellen = Nachkommastellen, 0 = ganze Pixel), Punkte
 * näher als `abstand` Pixel am vorigen fallen weg, und Ringe mit weniger als
 * 3 verschiedenen Punkten (kleiner als ein Pixel) werden ganz weggelassen.
 * Das macht die Daten etwa 3- bis 5-mal kleiner, ohne sichtbaren Unterschied.
 */
export function pfadSammler({ stellen = 0, abstand = 0 } = {}) {
  const faktor = 10 ** stellen;
  const runden = (wert) => Math.round(wert * faktor) / faktor;
  const teile = [];
  let ring = [];

  const ringAbschliessen = () => {
    if (ring.length >= 3) teile.push('M' + ring.map((p) => p.join(',')).join('L') + 'Z');
    ring = [];
  };

  return {
    moveTo(x, y) {
      ringAbschliessen();
      ring.push([runden(x), runden(y)]);
    },
    lineTo(x, y) {
      const punkt = [runden(x), runden(y)];
      const letzter = ring[ring.length - 1];
      if (!letzter) return void ring.push(punkt);
      const dx = punkt[0] - letzter[0];
      const dy = punkt[1] - letzter[1];
      if ((dx || dy) && dx * dx + dy * dy >= abstand * abstand) ring.push(punkt);
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
