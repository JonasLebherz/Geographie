/**
 * lib/gebiete/pfad.js – Hilfsfunktion: d3-Zeichenbefehle → kompakter SVG-Pfad
 *
 * Wird von allen Karten benutzt (lib/gebiete/zeichnen.js).
 */

/**
 * Sammelt die Punkte, die d3 zeichnen will, und baut daraus einen kurzen SVG-Pfad:
 * Punkte werden gerundet (stellen = Nachkommastellen, 0 = ganze Pixel), Punkte
 * näher als `abstand` Pixel am vorigen fallen weg, und Ringe mit weniger als
 * 3 verschiedenen Punkten (kleiner als ein Pixel) werden ganz weggelassen.
 * Das macht die Daten etwa 3- bis 5-mal kleiner, ohne sichtbaren Unterschied.
 */
export function pfadSammler({ stellen = 0, abstand = 0, offen = false } = {}) {
  const faktor = 10 ** stellen;
  const runden = (wert) => Math.round(wert * faktor) / faktor;
  const teile = [];
  let ring = [];

  // offen = Linien (Flüsse, Straßen): ab 2 Punkten, ohne Schließen (Z)
  const ringAbschliessen = () => {
    if (ring.length >= (offen ? 2 : 3)) teile.push('M' + ring.map((p) => p.join(',')).join('L') + (offen ? '' : 'Z'));
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
