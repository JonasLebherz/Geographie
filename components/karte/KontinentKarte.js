'use client';
/**
 * components/karte/KontinentKarte.js – zeichnet einen Kontinent mit allen Ländern
 *
 * Reine Darstellung, die Spiel-Logik steckt in KontinentSpiel.js. Die Karte bekommt
 * nur, welche Farbe jedes Land hat (zustand: id → "gruen" | "gelb" | "rot") und
 * meldet Klicks mit der Kennung des Landes (onLand(id)).
 *
 * Aufbau des SVG (von hinten nach vorn):
 *   Wasser → Gradnetz → graue Umgebung → gefragte Länder → Klickpunkte für Kleinstaaten
 *   → Ring um ein gerade aufgedecktes Land (damit man auch kleine Länder sofort findet)
 *
 * Namen stehen bewusst NICHT im SVG (auch nicht als title), sonst könnte man sie
 * beim Darüberfahren ablesen. Der Name erscheint nur über gelösten Ländern und nach
 * dem Spiel, als eigenes Schild (.kartentipp).
 */
import { memo, useRef } from 'react';
import { useKartenZoom } from './useKartenZoom';
import { Einpassen, Minus, Plus } from '@/components/Symbole';

/** Die Länder als eigene, gemerkte Komponente: Sie zeichnet nur neu, wenn sich Farben ändern. */
const Laender = memo(function Laender({ laender, zustand, effekt }) {
  const klasse = (id) => {
    const farbe = zustand[id];
    let k = farbe ?? 'frei';
    if (effekt?.id === id) k += ` ${effekt.art}`;
    return k;
  };
  return (
    <>
      <g>
        {laender.map((land) =>
          land.pfad ? <path key={land.id} data-id={land.id} className={`land ${klasse(land.id)}`} d={land.pfad} /> : null,
        )}
      </g>
      <g>
        {laender
          .filter((land) => land.punkt)
          .map((land) => (
            <g
              key={land.id}
              data-id={land.id}
              className={`marke ${klasse(land.id)}`}
              transform={`translate(${land.punkt[0]} ${land.punkt[1]})`}
            >
              <circle className="marke-punkt" r="1" />
              <circle className="marke-ziel" r="1" />
            </g>
          ))}
      </g>
    </>
  );
});

export default function KontinentKarte({ karte, zustand, effekt, offen, namenZeigen, onLand }) {
  const svgRef = useRef(null);
  const tippRef = useRef(null);
  const rahmenRef = useRef(null);
  const zoom = useKartenZoom(svgRef, karte.breite, karte.hoehe);
  const namen = useRef(new Map(karte.laender.map((l) => [l.id, l.name]))).current;
  const ring = effekt?.art === 'puls' ? karte.laender.find((l) => l.id === effekt.id && l.mitte) : null;

  function klick(e) {
    if (zoom.istGezogen()) return;
    const id = e.target.closest('[data-id]')?.dataset.id;
    if (id) onLand(id);
  }

  // Namensschild beim Darüberfahren – nur mit der Maus und nur, wo es erlaubt ist
  function bewegen(e) {
    const tipp = tippRef.current;
    if (!tipp) return;
    const id = e.pointerType === 'mouse' ? e.target.closest('[data-id]')?.dataset.id : null;
    if (!id || !namenZeigen(id)) return tipp.classList.remove('sichtbar');
    const rahmen = rahmenRef.current.getBoundingClientRect();
    tipp.textContent = namen.get(id);
    const x = Math.min(e.clientX - rahmen.left + 14, rahmen.width - tipp.offsetWidth - 8);
    const y = e.clientY - rahmen.top - tipp.offsetHeight - 10;
    tipp.style.transform = `translate(${Math.max(8, x)}px, ${y < 8 ? y + tipp.offsetHeight + 30 : y}px)`;
    tipp.classList.add('sichtbar');
  }

  return (
    <div className="karte karten-rahmen" ref={rahmenRef}>
      <svg
        ref={svgRef}
        className={`kontinentkarte${offen ? ' offen' : ''}`}
        viewBox={`0 0 ${karte.breite} ${karte.hoehe}`}
        role="img"
        aria-label={`Karte ${karte.name}`}
        onClick={klick}
        onPointerMove={bewegen}
        onPointerLeave={() => tippRef.current?.classList.remove('sichtbar')}
      >
        <rect className="wasser" width={karte.breite} height={karte.hoehe} />
        <path className="netz" d={karte.netz} />
        <path className="umland" d={karte.umland} />
        <Laender laender={karte.laender} zustand={zustand} effekt={effekt} />
        {ring && (
          <g key={ring.id} transform={`translate(${ring.mitte[0]} ${ring.mitte[1]})`} aria-hidden="true">
            <circle className="aufdeck-ring" r="1" />
            <circle className="aufdeck-ring zweiter" r="1" />
          </g>
        )}
      </svg>

      <div className="kartentipp" ref={tippRef} aria-hidden="true" />

      <div className="zoom">
        <button type="button" onClick={zoom.zoomRein} disabled={zoom.maximal} aria-label="Hineinzoomen" title="Hineinzoomen">
          <Plus />
        </button>
        <button type="button" onClick={zoom.zoomRaus} disabled={!zoom.gezoomt} aria-label="Herauszoomen" title="Herauszoomen">
          <Minus />
        </button>
        <button type="button" onClick={zoom.ganzeKarte} disabled={!zoom.gezoomt} aria-label="Ganze Karte" title="Ganze Karte">
          <Einpassen />
        </button>
      </div>
    </div>
  );
}
