'use client';
/**
 * KontinentWahl.js – Weltkarte und Liste der Kontinente
 *
 * Karte und Liste sind gekoppelt: Fährt man über einen Kontinent (auf der Karte oder
 * in der Liste), wird er an beiden Stellen hervorgehoben. Ein Klick auf der Karte
 * fliegt kurz in den Kontinent hinein (Kamerafahrt), dann öffnet sich das Spiel.
 * Die Liste ist zugleich der Weg für Tastatur und Bildschirmleser (echte Links).
 * In der Liste steht auch der eigene Bestwert (nur in diesem Browser gespeichert).
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chevron } from '@/components/Symbole';
import { bestwerteLesen } from '@/lib/bestwerte';
import { useT } from '@/lib/sprache';

const FLUG_DAUER = 520; // ms

export default function KontinentWahl({ welt }) {
  const t = useT();
  const router = useRouter();
  const [aktiv, setAktiv] = useState(null);
  const [bestwerte, setBestwerte] = useState({});
  const inhaltRef = useRef(null);
  const fliegt = useRef(false);

  useEffect(() => setBestwerte(bestwerteLesen()), []);

  const ziel = (slug) => `/kontinente/${slug}`;

  function vorladen(slug) {
    setAktiv(slug);
    router.prefetch(ziel(slug));
  }

  /** Kamerafahrt in den Kontinent hinein, danach Seitenwechsel */
  function oeffnen(slug) {
    if (fliegt.current) return;
    const inhalt = inhaltRef.current;
    const flaeche = inhalt?.querySelector(`[data-kontinent="${slug}"] path`);
    const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!flaeche || ruhig || !inhalt.animate) return router.push(ziel(slug));

    fliegt.current = true;
    setAktiv(slug);
    const kasten = flaeche.getBBox();
    const massstab = Math.min(4, 0.9 * Math.min(welt.breite / kasten.width, welt.hoehe / kasten.height));
    const dx = welt.breite / 2 - (kasten.x + kasten.width / 2) * massstab;
    const dy = welt.hoehe / 2 - (kasten.y + kasten.height / 2) * massstab;
    const flug = { duration: FLUG_DAUER, easing: 'cubic-bezier(.5, 0, .2, 1)', fill: 'forwards' };
    inhalt.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${massstab})` }], flug);
    // Die anderen Kontinente blenden aus, die Beschriftungen auch
    inhalt.querySelectorAll(`.kontinent:not([data-kontinent="${slug}"]), text`).forEach((el) =>
      el.animate([{ opacity: 1 }, { opacity: 0 }], { ...flug, duration: FLUG_DAUER * 0.6 }),
    );
    setTimeout(() => router.push(ziel(slug)), FLUG_DAUER - 60);
  }

  return (
    <div className="auswahl">
      <div className="karte weltkarte-karte erscheinen" style={{ '--i': 1 }}>
        <svg
          className="weltkarte"
          viewBox={`0 0 ${welt.breite} ${welt.hoehe}`}
          aria-hidden="true"
          onMouseLeave={() => setAktiv(null)}
        >
          <g ref={inhaltRef} style={{ transformOrigin: '0 0' }}>
            {welt.kontinente.map((k) => (
              <g
                key={k.slug}
                data-kontinent={k.slug}
                className={`kontinent${aktiv === k.slug ? ' aktiv' : ''}`}
                onMouseEnter={() => vorladen(k.slug)}
                onClick={() => oeffnen(k.slug)}
              >
                <path d={k.pfad} />
              </g>
            ))}
            {/* Beschriftungen obenauf, damit kein Kontinent eine Nachbar-Beschriftung verdeckt */}
            {welt.kontinente.map((k) => (
              <g key={k.slug} className={aktiv === k.slug ? 'aktiv' : undefined}>
                <text x={k.beschriftung[0]} y={k.beschriftung[1]}>
                  {t.ortsname(k)}
                  <tspan className="anzahl" x={k.beschriftung[0]} dy="18">
                    {t('{n} Länder', { n: k.anzahl })}
                  </tspan>
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      <ul className="liste karte erscheinen" style={{ '--i': 2 }}>
        {welt.kontinente.map((k) => {
          const bestwert = bestwerte[k.slug];
          return (
            <li key={k.slug}>
              <Link
                href={ziel(k.slug)}
                prefetch={false}
                className={`listen-zeile${aktiv === k.slug ? ' aktiv' : ''}`}
                onMouseEnter={() => vorladen(k.slug)}
                onMouseLeave={() => setAktiv(null)}
                onFocus={() => vorladen(k.slug)}
              >
                <span className="titel">{t.ortsname(k)}</span>
                <span className="zusatz">
                  {t('{n} Länder', { n: k.anzahl })}
                  {bestwert && <small>{t('Bestwert {q} %', { q: bestwert.quote })}</small>}
                </span>
                <Chevron />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
