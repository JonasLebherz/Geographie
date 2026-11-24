'use client';
/**
 * components/karte/KarteEbene.js – eine Ebene der Karte (ein Gebiet als SVG)
 *
 * Zwei Arten:
 *  - Erkunden: Die Untergebiete sind Flächen. Solche mit eigenem Gebiet (ziel) lassen sich
 *    anklicken (→ Kamerafahrt hinein), beim Darüberfahren erscheint der Name.
 *  - Quiz: Die Einheiten des Satzes (Flächen oder Städte als Punkte) ohne Namen; Farben
 *    kommen von außen (zustand: id → 'gruen' | 'gelb' | 'rot'). Namen erscheinen nur über
 *    gelösten Einheiten und nach der Runde.
 *
 * Zwei Ansichten (Schalter oben rechts, gespeichert in den Einstellungen):
 *  - Karte: Flächen in Pastelltönen wie im politischen Atlas (Nachbarn verschieden), Wasser blau
 *  - Satellit: Satellitenbild darunter (components/karte/Satellit.js), Flächen nur als Umriss
 *
 * Aufbau des SVG (von hinten nach vorn): Satellitenbild → Gradnetz → graue Umgebung →
 * Nebenkarten-Kästen → Flächen → Seen → Flüsse → Autobahnen → Klickpunkte / Städte →
 * Wahrzeichen → Ring um ein gerade aufgedecktes Gebiet.
 * Umgebung, Gradnetz und Flüsse laufen über den Kartenrand hinaus weiter (overflow: visible),
 * damit im breiteren Fenster nichts hart abbricht.
 */
import { memo, useCallback, useId, useRef, useState } from 'react';
import { useKartenZoom } from './useKartenZoom';
import Satellit from './Satellit';
import { Einpassen, Minus, Plus } from '@/components/Symbole';
import { useT } from '@/lib/sprache';
import { useEinstellung } from '@/lib/einstellungen';

/** Symbole der Wahrzeichen (feine Linien, 16 × 16) */
const SYMBOLE = {
  turm: 'M8 1.5 5 14.5M8 1.5l3 13M5.8 9.5h4.4M6.8 5.5h2.4',
  tor: 'M2.5 14V6h11v8M2.5 6 8 3l5.5 3M5.5 14V9M10.5 14V9',
  kirche: 'M8 1.5v3M6.5 3h3M4 14V8l4-3.5L12 8v6zM7 14v-3h2v3',
  burg: 'M2.5 14V7h2v2h2V7h3v2h2V7h2v7zM7 14v-3h2v3',
  berg: 'M1.5 13.5 6 6l2.5 3.5L10.5 7l4 6.5z',
  gebaeude: 'M2 12.5c1.5-4 3.5-6 6-7-1 3-1 5 0 7M8 12.5c1-3.5 3-5.5 6-6-1 2.5-1 4.5 0 6M1.5 12.5h13',
  arena: 'M2.5 6.5h11v7h-11zM2.5 9.5h11M5 6.5v7M8 6.5v7M11 6.5v7',
  stein: 'M2.5 13V7h2v6M6.5 13V7h2v6M10.5 13V7h2v6M2 6h11',
  tempel: 'M2 6 8 2.5 14 6zM3.5 7.5v5M6.5 7.5v5M9.5 7.5v5M12.5 7.5v5M2 13.5h12',
  statue: 'M8 4.2a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8M8 4.5v6M4.5 7h7M8 10.5l-2 3.5M8 10.5l2 3.5',
  mauer: 'M1.5 13V9l2-1V6h2v2l2-1 2 1V6h2v2l2 1v4z',
  pyramide: 'M1.5 13.5 8 3l6.5 10.5zM8 3l1.5 10.5',
  wasserfall: 'M3 3h10M5 3v6c0 2 1 3 3 3M8 3v7M11 3v6c0 2-1 3-3 3M3 14h10',
  bruecke: 'M1.5 11h13M3.5 11V4.5M12.5 11V4.5M3.5 4.5c1.5 3 3 4.5 4.5 4.5s3-1.5 4.5-4.5M6 11V8.3M10 11V8.3',
};

/** Flächen und Punkte als eigene, gemerkte Komponente: zeichnet nur neu, wenn sich Farben ändern */
const Einheiten = memo(function Einheiten({ flaechen, punkte, zustand, effekt, hervor, kulisse }) {
  const klasse = (id, grund) => {
    let k = zustand?.[id] ?? grund;
    if (effekt?.id === id) k += ` ${effekt.art}`;
    if (hervor === id) k += ' hervor';
    return k;
  };
  const stadt = new Set((punkte ?? []).map((p) => p.id));
  return (
    <>
      <g>
        {flaechen.map((f) =>
          f.pfad ? (
            <path
              key={f.id}
              data-id={kulisse ? undefined : f.id}
              className={`land f-${f.farbe ?? 0} ${kulisse ? 'kulisse' : klasse(f.id, f.ziel === null ? 'blatt' : 'frei')}`}
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
            className={`marke ${stadt.has(f.id) ? 'stadt ' : ''}${klasse(f.id, 'frei')}`}
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

/** Wahrzeichen als kleine runde Plaketten mit Symbol (Größe in Bildschirmpixeln) */
const Wahrzeichen = memo(function Wahrzeichen({ liste }) {
  return (
    <g className="wahrzeichen" aria-hidden="true">
      {liste.map((w) => (
        <g key={w.id} data-wz={w.id} transform={`translate(${w.punkt[0]} ${w.punkt[1]})`}>
          <g className="wz-bild">
            <circle className="wz-grund" r="9.5" />
            <path className="wz-linie" d={SYMBOLE[w.symbol] ?? SYMBOLE.turm} transform="translate(-6.5 -6.5) scale(.8125)" />
          </g>
        </g>
      ))}
    </g>
  );
});

/**
 * daten:  { knoten, karte: { breite, hoehe, netz, umland, fluesse, seen, autobahnen, wahrzeichen,
 *           nebenkarten, projektionen }, flaechen }
 * quiz:   { art: 'flaeche' | 'punkt', einheiten, umland? } – fehlt beim Erkunden
 * aktiv:  oberste Ebene (Zoom, Klicks); während einer Kamerafahrt ist keine aktiv
 */
export default function KarteEbene({
  daten, quiz, aktiv = true, zustand, effekt, offen = true, hervor, namenZeigen, onWahl, onVorschau,
}) {
  const t = useT();
  const idPraefix = useId().replace(/:/g, '');
  const svgRef = useRef(null);
  const tippRef = useRef(null);
  const rahmenRef = useRef(null);
  const { karte } = daten;
  const [ansichtArt, setAnsichtArt] = useEinstellung('ansicht');
  const satellit = ansichtArt === 'satellit';
  const [sichtbar, setSichtbar] = useState(null); // { ansicht, s } – für die Satellitenkacheln
  const meldung = useCallback((ansicht, s) => setSichtbar({ ansicht, s }), []);
  const zoom = useKartenZoom(svgRef, karte.breite, karte.hoehe, satellit ? meldung : null);

  const punktQuiz = quiz?.art === 'punkt';
  const flaechen = quiz && !punktQuiz ? quiz.einheiten : daten.flaechen;
  const punkte = punktQuiz ? quiz.einheiten : null;
  const alle = new Map([...flaechen, ...(punkte ?? [])].map((e) => [e.id, e]));
  const wahrzeichen = punktQuiz ? [] : karte.wahrzeichen ?? [];
  const wzNamen = new Map(wahrzeichen.map((w) => [w.id, w]));
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
    const maus = e.pointerType === 'mouse';
    const id = maus ? idVon(e) : null;
    const wz = maus && !quiz ? e.target.closest?.('[data-wz]')?.dataset.wz : null;
    const einheit = wz ? wzNamen.get(wz) : id && alle.get(id);
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
    <div className={`kartenebene ${modus}${aktiv ? ' aktiv' : ''}${satellit ? ' mit-satellit' : ''}`} ref={rahmenRef}>
      <svg
        ref={svgRef}
        className={`kontinentkarte ${modus}${offen ? ' offen' : ''}${satellit ? ' satellit' : ''}`}
        viewBox={`0 0 ${karte.breite} ${karte.hoehe}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={t('Karte {name}', { name: t.ortsname(daten.knoten) })}
        onClick={klick}
        onPointerMove={bewegen}
        onPointerLeave={() => tippRef.current?.classList.remove('sichtbar')}
      >
        {satellit && karte.projektionen && (
          <Satellit projektionen={karte.projektionen} ansicht={sichtbar?.ansicht} bildschirmProEinheit={sichtbar?.s} idPraefix={idPraefix} />
        )}
        <path className="netz" d={karte.netz} />
        <path className="umland" d={quiz?.umland ?? karte.umland} />
        {karte.nebenkarten.map((n) => (
          <rect key={`${n.x}-${n.y}`} className="nebenkarte" x={n.x} y={n.y} width={n.b} height={n.h} rx="6" />
        ))}
        {punktQuiz && <Einheiten flaechen={daten.flaechen} kulisse />}
        <Einheiten
          flaechen={punktQuiz ? [] : flaechen}
          punkte={null}
          zustand={zustand}
          effekt={effekt}
          hervor={hervor}
        />
        {karte.seen && <path className="seen" d={karte.seen} />}
        {karte.fluesse && <path className="fluesse" d={karte.fluesse} />}
        {karte.autobahnen && <path className="autobahnen" d={karte.autobahnen} />}
        {punkte && <Einheiten flaechen={[]} punkte={punkte} zustand={zustand} effekt={effekt} />}
        <Wahrzeichen liste={wahrzeichen} />
        {ring?.mitte && (
          <g key={ring.id} transform={`translate(${ring.mitte[0]} ${ring.mitte[1]})`} aria-hidden="true">
            <circle className="aufdeck-ring" r="1" />
            <circle className="aufdeck-ring zweiter" r="1" />
          </g>
        )}
      </svg>

      <div className="kartentipp" ref={tippRef} aria-hidden="true" />

      {aktiv && (
        <>
          <div className="ansicht-schalter" role="radiogroup" aria-label={t('Ansicht')}>
            {[
              ['karte', t('Karte')],
              ['satellit', t('Satellit')],
            ].map(([wert, text]) => (
              <button
                key={wert}
                type="button"
                role="radio"
                aria-checked={ansichtArt === wert}
                className={ansichtArt === wert ? 'gewaehlt' : undefined}
                onClick={() => setAnsichtArt(wert)}
              >
                {text}
              </button>
            ))}
          </div>
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
          {satellit && <p className="quelle-satellit">Sentinel-2 cloudless 2016 · s2maps.eu by EOX (CC BY 4.0)</p>}
        </>
      )}
    </div>
  );
}
