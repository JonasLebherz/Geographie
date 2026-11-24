'use client';
/**
 * components/karte/KarteEbene.js – eine Ebene der Karten-Erkundung (ein Gebiet als SVG)
 *
 * Zwei Arten:
 *  - Erkunden: Die Untergebiete sind Flächen. Solche mit eigenem Gebiet (ziel) lassen sich
 *    anklicken (→ Kamerafahrt hinein), beim Darüberfahren erscheint der Name.
 *  - Quiz: Die Einheiten des Satzes (Flächen oder Städte als Punkte) ohne Namen; Farben
 *    kommen von außen (zustand: id → 'gruen' | 'gelb' | 'rot'). Namen erscheinen nur über
 *    gelösten Einheiten und nach der Runde.
 *
 * Aufbau des SVG (von hinten nach vorn): Gradnetz → graue Umgebung → Nebenkarten-Kästen →
 * Flächen → Klickpunkte (Kleinstaaten) bzw. Städte → Ring um ein gerade aufgedecktes Gebiet.
 * Das SVG zeigt die ganze Karte („meet“); Umgebung und Gradnetz laufen über den Kartenrand
 * hinaus weiter (overflow: visible), damit im breiteren Fenster nichts hart abbricht.
 */
import { memo, useRef } from 'react';
import { useKartenZoom } from './useKartenZoom';
import { Einpassen, Minus, Plus } from '@/components/Symbole';
import { useT } from '@/lib/sprache';

/** Flächen und Punkte als eigene, gemerkte Komponente: zeichnet nur neu, wenn sich Farben ändern */
const Einheiten = memo(function Einheiten({ flaechen, punkte, zustand, effekt, hervor, kulisse }) {
  const klasse = (id, grund) => {
    let k = zustand?.[id] ?? grund;
    if (effekt?.id === id) k += ` ${effekt.art}`;
    if (hervor === id) k += ' hervor';
    return k;
  };
  return (
    <>
      <g>
        {flaechen.map((f) =>
          f.pfad ? (
            <path
              key={f.id}
              data-id={kulisse ? undefined : f.id}
              className={`land ${kulisse ? 'kulisse' : klasse(f.id, f.ziel === null ? 'blatt' : 'frei')}`}
              d={f.pfad}
            />
          ) : null,
        )}
      </g>
      <g>
        {[...(kulisse ? [] : flaechen.filter((f) => f.punkt)), ...(punkte ?? [])].map((f) => (
          <g
            key={f.id}
            data-id={f.id}
            className={`marke ${punkte?.includes(f) ? 'stadt ' : ''}${klasse(f.id, 'frei')}`}
            transform={`translate(${f.punkt[0]} ${f.punkt[1]})`}
          >
            <circle className="marke-punkt" r="1" />
            <circle className="marke-ziel" r="1" />
          </g>
        ))}
      </g>
    </>
  );
});

/**
 * daten:  { karte: { breite, hoehe, netz, umland, nebenkarten }, flaechen }
 * quiz:   { art: 'flaeche' | 'punkt', einheiten, umland? } – fehlt beim Erkunden
 * aktiv:  oberste Ebene (Zoom, Klicks); während einer Kamerafahrt ist keine aktiv
 */
export default function KarteEbene({
  daten, quiz, aktiv = true, zustand, effekt, offen = true, hervor, namenZeigen, onWahl, onVorschau,
}) {
  const t = useT();
  const svgRef = useRef(null);
  const tippRef = useRef(null);
  const rahmenRef = useRef(null);
  const { karte } = daten;
  const zoom = useKartenZoom(svgRef, karte.breite, karte.hoehe);

  const punktQuiz = quiz?.art === 'punkt';
  const flaechen = quiz && !punktQuiz ? quiz.einheiten : daten.flaechen;
  const punkte = punktQuiz ? quiz.einheiten : null;
  const alle = new Map([...flaechen, ...(punkte ?? [])].map((e) => [e.id, e]));
  const ring = effekt?.art === 'puls' ? alle.get(effekt.id) : null;

  const idVon = (e) => e.target.closest?.('[data-id]')?.dataset.id;

  function klick(e) {
    if (!aktiv || zoom.istGezogen()) return;
    const id = idVon(e);
    if (id) onWahl?.(id, e);
  }

  // Namensschild beim Darüberfahren (nur Maus) – beim Erkunden immer, im Quiz nur wo erlaubt
  function bewegen(e) {
    const tipp = tippRef.current;
    if (!tipp || !aktiv) return;
    const id = e.pointerType === 'mouse' ? idVon(e) : null;
    const einheit = id && alle.get(id);
    if (!einheit || (quiz && !namenZeigen?.(id))) {
      tipp.classList.remove('sichtbar');
      return;
    }
    if (!quiz && einheit.ziel) onVorschau?.(einheit.ziel);
    const rahmen = rahmenRef.current.getBoundingClientRect();
    tipp.textContent = t.ortsname(einheit);
    const x = Math.min(e.clientX - rahmen.left + 14, rahmen.width - tipp.offsetWidth - 8);
    const y = e.clientY - rahmen.top - tipp.offsetHeight - 10;
    tipp.style.transform = `translate(${Math.max(8, x)}px, ${y < 8 ? y + tipp.offsetHeight + 30 : y}px)`;
    tipp.classList.add('sichtbar');
  }

  const modus = quiz ? 'quiz' : 'erkunden';
  return (
    <div className={`kartenebene ${modus}${aktiv ? ' aktiv' : ''}`} ref={rahmenRef}>
      <svg
        ref={svgRef}
        className={`kontinentkarte ${modus}${offen ? ' offen' : ''}`}
        viewBox={`0 0 ${karte.breite} ${karte.hoehe}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={t('Karte {name}', { name: t.ortsname(daten.knoten) })}
        onClick={klick}
        onPointerMove={bewegen}
        onPointerLeave={() => tippRef.current?.classList.remove('sichtbar')}
      >
        <path className="netz" d={karte.netz} />
        <path className="umland" d={quiz?.umland ?? karte.umland} />
        {karte.nebenkarten.map((n) => (
          <rect key={`${n.x}-${n.y}`} className="nebenkarte" x={n.x} y={n.y} width={n.b} height={n.h} rx="6" />
        ))}
        {punktQuiz && <Einheiten flaechen={daten.flaechen} kulisse />}
        <Einheiten
          flaechen={punktQuiz ? [] : flaechen}
          punkte={punkte}
          zustand={zustand}
          effekt={effekt}
          hervor={hervor}
        />
        {ring?.mitte && (
          <g key={ring.id} transform={`translate(${ring.mitte[0]} ${ring.mitte[1]})`} aria-hidden="true">
            <circle className="aufdeck-ring" r="1" />
            <circle className="aufdeck-ring zweiter" r="1" />
          </g>
        )}
      </svg>

      <div className="kartentipp" ref={tippRef} aria-hidden="true" />

      {aktiv && (
        <div className="zoom">
          <button type="button" onClick={zoom.zoomRein} disabled={zoom.maximal} aria-label={t('Hineinzoomen')} title={t('Hineinzoomen')}>
            <Plus />
          </button>
          <button type="button" onClick={zoom.zoomRaus} disabled={!zoom.gezoomt} aria-label={t('Herauszoomen')} title={t('Herauszoomen')}>
            <Minus />
          </button>
          <button type="button" onClick={zoom.ganzeKarte} disabled={!zoom.gezoomt} aria-label={t('Ganze Karte')} title={t('Ganze Karte')}>
            <Einpassen />
          </button>
        </div>
      )}
    </div>
  );
}
