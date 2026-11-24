'use client';
/**
 * components/karte/Satellit.js – Satellitenbild unter der Karte (Kacheln wie bei Online-Karten)
 *
 * Bild: „Sentinel-2 cloudless 2016“ von EOX (https://s2maps.eu), frei nutzbar mit Quellenangabe
 * (CC BY 4.0). Die Kacheln sind Web-Mercator – unsere Karten auch (lib/gebiete/zeichnen.js),
 * deshalb ist jede Kachel auf der Karte ein einfaches Rechteck:
 *   x = tx + k · (Länge − l0) im Bogenmaß
 *   y = ty − k · ln(tan(π/4 + Breite/2))
 * (l0, k, tx, ty kommen je Karte bzw. Nebenkarte aus den Kartendaten: karte.projektionen).
 *
 * Geladen werden nur die Kacheln im sichtbaren Ausschnitt, in der Auflösung, die zur
 * aktuellen Zoomstufe passt (etwa eine Kachel je 256 Bildschirmpixel).
 */
import { memo } from 'react';

const QUELLE = (z, x, y) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/${z}/${y}/${x}.jpg`;
const MAX_ZOOM = 14;
const MAX_KACHELN = 90;
const GRAD = Math.PI / 180;

const mercY = (breite) => Math.log(Math.tan(Math.PI / 4 + (breite * GRAD) / 2));
const breiteAus = (y) => Math.atan(Math.sinh(y)) / GRAD;

/** Kacheln für eine Projektion und den sichtbaren Ausschnitt */
function kachelnFuer(p, index, ansicht, bildschirmProEinheit) {
  const [rx0, ry0, rx1, ry1] = p.rechteck;
  const x0 = Math.max(ansicht.x, rx0);
  const y0 = Math.max(ansicht.y, ry0);
  const x1 = Math.min(ansicht.x + ansicht.w, rx1);
  const y1 = Math.min(ansicht.y + ansicht.h, ry1);
  if (x1 <= x0 || y1 <= y0) return [];

  // Auflösung: eine Kachel soll auf dem Bildschirm etwa 256 Pixel (× Pixeldichte) breit sein
  const dichte = Math.min(2, window.devicePixelRatio || 1);
  let z = Math.round(Math.log2((2 * Math.PI * p.k * bildschirmProEinheit * dichte) / 256));
  z = Math.max(1, Math.min(MAX_ZOOM, z));

  // Sichtbarer Ausschnitt in Länge/Breite (Länge ohne Umbruch, damit es über ±180° weitergeht)
  const laenge = (x) => p.l0 + (x - p.tx) / p.k / GRAD;
  const breite = (y) => Math.max(-85, Math.min(85, breiteAus((p.ty - y) / p.k)));
  let liste;
  for (;;) {
    const n = 2 ** z;
    const tx0 = Math.floor(((laenge(x0) + 180) / 360) * n);
    const tx1 = Math.floor(((laenge(x1) + 180) / 360) * n);
    const ty0 = Math.max(0, Math.floor(((1 - mercY(breite(y0)) / Math.PI) / 2) * n));
    const ty1 = Math.min(n - 1, Math.floor(((1 - mercY(breite(y1)) / Math.PI) / 2) * n));
    if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) > MAX_KACHELN && z > 1) {
      z -= 1;
      continue;
    }
    liste = [];
    const breiteKachel = ((2 * Math.PI) / n) * p.k;
    for (let tx = tx0; tx <= tx1; tx += 1) {
      for (let ty = ty0; ty <= ty1; ty += 1) {
        const lonLinks = (tx / n) * 360 - 180;
        const yOben = Math.PI * (1 - (2 * ty) / n); // Mercator-y der Oberkante
        const x = p.tx + p.k * (lonLinks - p.l0) * GRAD;
        const y = p.ty - p.k * yOben;
        const xUrl = ((tx % n) + n) % n;
        liste.push({ schluessel: `${index}-${z}-${tx}-${ty}`, url: QUELLE(z, xUrl, ty), x, y, b: breiteKachel, h: breiteKachel });
      }
    }
    return liste;
  }
}

function Satellit({ projektionen, ansicht, bildschirmProEinheit, idPraefix }) {
  if (!ansicht || !bildschirmProEinheit) return null;
  return (
    <g className="satellit-kacheln" aria-hidden="true">
      {projektionen.map((p, i) => {
        const [x0, y0, x1, y1] = p.rechteck;
        const clip = `${idPraefix}-sat-${i}`;
        return (
          <g key={clip}>
            <clipPath id={clip}>
              <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={i ? 6 : 0} />
            </clipPath>
            <g clipPath={`url(#${clip})`}>
              {kachelnFuer(p, i, ansicht, bildschirmProEinheit).map((k) => (
                // Kacheln minimal größer, damit zwischen ihnen keine Haarlinien blitzen
                <image key={k.schluessel} href={k.url} x={k.x} y={k.y} width={k.b + 0.6} height={k.h + 0.6} preserveAspectRatio="none" />
              ))}
            </g>
          </g>
        );
      })}
    </g>
  );
}

export default memo(Satellit);
