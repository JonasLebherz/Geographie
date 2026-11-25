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
 * Nebenkarten-Kästen → (Gebietskarte als Kulisse) → Flächen → Seen → Flüsse → Linien (Flüsse-,
 * Autobahn-Quiz) → Klickpunkte / Orte / Bildsymbole → Distanz-Marken → Aufdeck-Ring.
 * Umgebung, Gradnetz und Flüsse laufen über den Kartenrand hinaus weiter (overflow: visible),
 * damit im breiteren Fenster nichts hart abbricht.
 */
import { memo, useCallback, useContext, useId, useRef, useState } from 'react';
import { AnsichtKontext } from '@/lib/party/ansicht';
import { useKartenZoom } from './useKartenZoom';
import Satellit from './Satellit';
import { Einpassen, Minus, Plus } from '@/components/Symbole';
import { useT } from '@/lib/sprache';
import { useEinstellung } from '@/lib/einstellungen';

/**
 * Bildsymbole für Sehenswürdigkeiten und Stadien: runde Plakette, darin eine kleine Zeichnung
 * aus Fläche (zart getönt) und feiner Linie. Koordinaten um den Mittelpunkt, etwa ±8.
 */
export const BILDER = {
  burg: ['M-7 7V-2h2.5v2H-2V-5h4v5h2.5v-2H7v9z', 'M-1.5 7V4a1.5 1.5 0 0 1 3 0v3M-7-2v-1.6M-4.5-2v-1.6M-2-5v-1.6M2-5v-1.6M4.5-2v-1.6M7-2v-1.6'],
  schloss: ['M-7.5 7V0h15v7zM-3 0v-2.5a3 3 0 0 1 6 0V0z', 'M0-5.5v-2.3M-5 2.5v2M-2.5 2.5v2M2.5 2.5v2M5 2.5v2M-7.5 0h15'],
  kirche: ['M-6 7V0l3.5-2.5L-1 0v7zM-1 7V-4L1-7.5 3-4v11zM3 7V0l3 2v5z', 'M1-7.5v-2.3M-.2-8.8h2.4M0 7V4.5h2V7'],
  moschee: ['M-5 7V1a5 5 0 0 1 10 0v6zM5.6 7V-5l.9-1.5.9 1.5v12z', 'M0-4v-2M-2 7V4a2 2 0 0 1 4 0v3'],
  tempel: ['M-8-2 0-7l8 5z', 'M-6-1v7M-2-1v7M2-1v7M6-1v7M-8 7h16M-8-2h16'],
  turm: ['M-2.2 7-1-3.5h2L2.2 7zM0-7a2.3 2.3 0 1 1 0 4.6A2.3 2.3 0 0 1 0-7', 'M0-7v-2.5M-2.2 7h4.4'],
  bruecke: ['M-8 2.5h16V4H-8z', 'M-6 2.5v-8M6 2.5v-8M-6-5.5C-4-1.5-2 .5 0 .5s4-2 6-6M-3 2.5v-2.8M3 2.5v-2.8M-8 7c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 4-1.5'],
  leuchtturm: ['M-2.6 7-1.6-3h3.2l1 10zM-2-3v-3h4v3z', 'M-2.4 1.5h4.8M-2.9 4.5h5.8M-2.5-6 0-8.2 2.5-6M3.5-4.5h3.5M-3.5-4.5H-7'],
  wasserfall: ['M-8 7V-6h5.5v13zM3.5 7V-6H8v13z', 'M-2.5-6c2.5 0 2.5 3 2.5 6s0 5 2 7M-2.5-2.5c1.5 0 1.5 2.5 1.5 4.5M-1 7h3', 'wasser'],
  denkmal: ['M-1.6 4.5-.8-6 0-8l.8 2 .8 10.5zM-5 7V4.5h10V7z', 'M-5 7h10'],
  statue: ['M-4 7V4.8h8V7zM0-6.3a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2', 'M0-3v5.5M0-1.5-3-4.5M0-1.5l3-2.2M-1.6 4.8 0 2.5l1.6 2.3'],
  ruine: ['M-7 7V5h14v2z', 'M-5 5v-8M-2 5v-5M2 5v-9.5M5 5v-3M-6.5-3H-.5M1-4.5h2.5'],
  arena: ['M-8 6.5V-3.5c2.5-1.8 13.5-1.8 16 0v10z', 'M-5.5 6.5V3.5M-2 6.5V3.5M2 6.5V3.5M5.5 6.5V3.5M-5.5.5v-2M-2 .5v-2M2 .5v-2M5.5 .5v-2M-8 1.8h16'],
  pyramide: ['M-8 7 0-6.5 8 7z', 'M0-6.5 2.2 7M-4.5 1.2h6'],
  museum: ['M-8-2 0-7l8 5zM-8 7V5.5h16V7z', 'M-5.5-1v5.8M-2-1v5.8M2-1v5.8M5.5-1v5.8'],
  theater: ['M-8 7V0c0-4 4-7 8-7s8 3 8 7v7z', 'M-4.5 7V2.5M0 7V1.5M4.5 7V2.5M0-7v-2'],
  berg: ['M-8.5 7-2-4.5l2.6 3.5 2.2-3L8.5 7z', 'M-2-4.5-4.2-1l2.2-1 1.5 1.5M2.8-4l1.8 2.6', 'schnee'],
  park: ['M0-8.5-5.5 0h3l-4 5h13l-4-5h3z', 'M0 5v3.5'],
  stadion: ['M-8.5 0a8.5 5 0 1 0 17 0 8.5 5 0 1 0-17 0z', 'M-4.8-1.8h9.6v3.6h-9.6zM0-1.8v3.6M-8.5 0c0-3 4-4.5 8.5-4.5S8.5-3 8.5 0'],
};

/** Plakette mit Bildsymbol (Größe in Bildschirmpixeln über --px) */
function Bild({ symbol }) {
  const [flaeche, linie, art] = BILDER[symbol] ?? BILDER.denkmal;
  return (
    <g className={`bild-symbol sym-${art ?? symbol}`}>
      <circle className="bild-grund" r="14" />
      <g transform="scale(1.12)">
        <path className="bild-flaeche" d={flaeche} />
        <path className="bild-linie" d={linie} />
      </g>
    </g>
  );
}

/** Flächen und Punkte als eigene, gemerkte Komponente: zeichnet nur neu, wenn sich Farben ändern */
const Einheiten = memo(function Einheiten({ flaechen, punkte, linien, zustand, effekt, hervor, kulisse, idPraefix = '' }) {
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
              data-f={kulisse ? f.id : undefined}
              className={`land f-${f.farbe ?? 0} ${kulisse ? 'kulisse' : klasse(f.id, f.ziel === null ? 'blatt' : 'frei')}`}
              d={f.pfad}
            />
          ) : null,
        )}
      </g>
      {linien && (
        <g>
          {linien.map((l) => (
            <g key={l.id} data-id={l.id} className={`linie-einheit ${klasse(l.id, 'frei')}`}>
              <path className="linie-treffer" d={l.pfad} />
              <path className="linie-strich" d={l.pfad} />
            </g>
          ))}
        </g>
      )}
      <g>
        {[...(kulisse ? [] : flaechen.filter((f) => f.punkt && !f.lupe)), ...(punkte ?? [])].map((f, i) =>
          f.symbol ? (
            <g
              key={f.id}
              data-id={f.id}
              className={`marke bild ${klasse(f.id, 'frei')}`}
              transform={`translate(${f.punkt[0]} ${f.punkt[1]})`}
              style={{ '--i': i % 40 }}
            >
              <g className="bild-huelle">
                <Bild symbol={f.symbol} />
              </g>
            </g>
          ) : (
            <g
              key={f.id}
              data-id={f.id}
              className={`marke ${stadt.has(f.id) ? 'stadt ' : ''}${klasse(f.id, 'frei')}`}
              transform={`translate(${f.punkt[0]} ${f.punkt[1]})`}
            >
              <circle className="marke-punkt" r="1" />
              <circle className="marke-ziel" r="1" />
            </g>
          ),
        )}
      </g>
      {!kulisse && (
        <g className="lupen">
          {flaechen
            .filter((f) => f.lupe)
            .map((f) => {
              const { x, y, r, k, m } = f.lupe;
              const zustandKlasse = klasse(f.id, f.ziel === null ? 'blatt' : 'frei');
              const laenge = Math.hypot(x - f.punkt[0], y - f.punkt[1]) || 1;
              const ende = [x - ((x - f.punkt[0]) / laenge) * r, y - ((y - f.punkt[1]) / laenge) * r];
              const clip = `lupe-${idPraefix}-${f.id}`;
              return (
                <g key={f.id} data-id={f.id} className={`lupe ${zustandKlasse}`}>
                  <clipPath id={clip}>
                    <circle cx={x} cy={y} r={r} />
                  </clipPath>
                  <line className="lupe-strich" x1={f.punkt[0]} y1={f.punkt[1]} x2={ende[0]} y2={ende[1]} />
                  <circle className="lupe-ort" cx={f.punkt[0]} cy={f.punkt[1]} r="4.5" />
                  <circle className="lupe-grund" cx={x} cy={y} r={r} />
                  <g clipPath={`url(#${clip})`}>
                    <path
                      className={`land f-${f.farbe ?? 0} ${zustandKlasse}`}
                      d={f.pfad}
                      transform={`translate(${x} ${y}) scale(${k}) translate(${-m[0]} ${-m[1]})`}
                    />
                  </g>
                  <circle className="lupe-rand" cx={x} cy={y} r={r} />
                </g>
              );
            })}
        </g>
      )}
    </>
  );
});

/**
 * daten:  { knoten, karte: { breite, hoehe, netz, umland, fluesse, seen, nebenkarten, projektionen }, flaechen }
 * quiz:   { art: 'flaeche' | 'punkt' | 'linie' | 'distanz', einheiten, umland?, kulisse?, ohneFluesse? }
 *         – fehlt beim Erkunden. Bei 'punkt', 'linie', 'distanz' und kulisse liegt die Gebietskarte als
 *         nicht anklickbarer Hintergrund darunter.
 * aktiv:  oberste Ebene (Zoom, Klicks); während einer Kamerafahrt ist keine aktiv
 * Distanz-Quiz: onPunkt([x, y], flaecheId) – Klick irgendwohin (Kartenkoordinaten);
 *         marken: [{ id, klick: [x, y], ziel: [x, y], farbe, text }] – Linie Klick → Ziel mit Beschriftung
 */
export default function KarteEbene({
  daten, quiz, aktiv = true, zustand, effekt, offen = true, hervor, namenZeigen, onWahl, onVorschau, onPunkt, marken,
}) {
  const t = useT();
  const idPraefix = useId().replace(/:/g, '');
  const svgRef = useRef(null);
  const tippRef = useRef(null);
  const rahmenRef = useRef(null);
  const { karte } = daten;
  const [ansichtGewaehlt, setAnsichtArt] = useEinstellung('ansicht');
  // Party: Der Gastgeber kann die Ansicht festlegen – dann gibt es keinen Schalter
  const ansichtFest = useContext(AnsichtKontext);
  const ansichtArt = ansichtFest === 'karte' || ansichtFest === 'satellit' ? ansichtFest : ansichtGewaehlt;
  const satellit = ansichtArt === 'satellit';
  const [sichtbar, setSichtbar] = useState(null); // { ansicht, s } – für die Satellitenkacheln
  const meldung = useCallback((ansicht, s) => setSichtbar({ ansicht, s }), []);
  const zoom = useKartenZoom(svgRef, karte.breite, karte.hoehe, satellit ? meldung : null);

  const art = quiz?.art;
  const mitKulisse = Boolean(quiz) && (art !== 'flaeche' || quiz.kulisse);
  const flaechen = art === 'flaeche' ? quiz.einheiten : quiz ? [] : daten.flaechen;
  const punkte = art === 'punkt' ? quiz.einheiten : null;
  const linien = art === 'linie' ? quiz.einheiten : null;
  const alle = new Map([...flaechen, ...(punkte ?? []), ...(linien ?? [])].map((e) => [e.id, e]));
  const ring = effekt?.art === 'puls' ? alle.get(effekt.id) : null;

  const idVon = (e) => e.target.closest?.('[data-id]')?.dataset.id;

  function klick(e) {
    if (!aktiv || zoom.istGezogen()) return;
    if (art === 'distanz') {
      const svg = svgRef.current;
      const matrix = svg.getScreenCTM()?.inverse();
      if (!matrix) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix);
      onPunkt?.([p.x, p.y], e.target.closest?.('[data-f]')?.dataset.f ?? null);
      return;
    }
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

  const modus = quiz ? `quiz quiz-${art}${quiz.ohneFluesse ? ' quiz-fluesse' : ''}${art === 'flaeche' && quiz.kulisse ? ' kulisse-ruhig' : ''}` : 'erkunden';
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
        {mitKulisse && <Einheiten flaechen={daten.flaechen} kulisse />}
        <Einheiten flaechen={flaechen} punkte={null} zustand={zustand} effekt={effekt} hervor={hervor} idPraefix={idPraefix} />
        {karte.seen && <path className="seen" d={karte.seen} />}
        {karte.fluesse && !quiz?.ohneFluesse && <path className="fluesse" d={karte.fluesse} />}
        {(punkte || linien) && <Einheiten flaechen={[]} punkte={punkte} linien={linien} zustand={zustand} effekt={effekt} />}
        {marken?.map((m) => (
          <g key={m.id} className={`distanz-marke ${m.farbe ?? ''}`} aria-hidden="true">
            {m.klick && <line className="distanz-linie" x1={m.klick[0]} y1={m.klick[1]} x2={m.ziel[0]} y2={m.ziel[1]} />}
            {m.klick && (
              <g transform={`translate(${m.klick[0]} ${m.klick[1]})`}>
                <circle className="distanz-klick px-fest" r="4" />
              </g>
            )}
            <g transform={`translate(${m.ziel[0]} ${m.ziel[1]})`}>
              <g className="px-fest">
                <g className="distanz-ziel">
                  <circle r="8" />
                  <circle className="kern" r="3" />
                </g>
                {m.text && (
                  <text className="distanz-text" y="-15">
                    {m.text}
                  </text>
                )}
              </g>
            </g>
          </g>
        ))}
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
          {ansichtFest === 'frei' && (
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
          )}
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
