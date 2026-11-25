/**
 * app/page.js – Startseite: erst die Wahl, was man spielen will (Wunsch von Jonas)
 *
 * Kacheln wie Spielmodi: „Weltkarte“ führt in die Karten-Erkundung (/karte), die übrigen sind
 * Baustellen („Kommt bald“) mit Comic-Figuren, die daran arbeiten (components/Baustelle.js).
 * Keine Begrüßung, keine Bedienhinweise – nur Fakten; erklärt wird hinter dem „?“.
 */
import Link from 'next/link';
import { alleKnoten, baum, weltSkizze } from '@/lib/gebiete';
import Baustelle from '@/components/Baustelle';
import { PRODUKTNAME } from '@/components/Logo';
import { T } from '@/lib/sprache';
import { Chevron } from '@/components/Symbole';

export const metadata = { title: { absolute: PRODUKTNAME } };

export default function Startseite() {
  const knoten = alleKnoten().map((id) => baum().get(id));
  const laender = knoten.filter((k) => k.ebene === 'land').length;
  const kontinente = knoten.filter((k) => k.ebene === 'kontinent').length;
  const skizze = weltSkizze();
  return (
    <div className="start">
      <h1 className="unsichtbar">{PRODUKTNAME}</h1>
      <ul className="kacheln">
        <li>
          <Link href="/karte" className="kachel kachel-weltkarte">
            <span className="kachel-bild">
              <svg viewBox={`0 0 ${skizze.breite} ${skizze.hoehe}`} className="welt-skizze" aria-hidden="true">
                <rect width={skizze.breite} height={skizze.hoehe} className="skizze-wasser" />
                {skizze.pfade.map((p) => (
                  <path key={p.farbe} d={p.d} className={`skizze-land f-${p.farbe}`} />
                ))}
              </svg>
            </span>
            <span className="kachel-text">
              <strong>
                <T>Weltkarte</T>
              </strong>
              <small>
                <T text="{n} Länder · {k} Kontinente" werte={{ n: laender, k: kontinente }} />
              </small>
            </span>
            <Chevron />
          </Link>
        </li>
        {[0, 1, 2].map((art) => (
          <li key={art}>
            <div className="kachel kachel-bald">
              <span className="kachel-bild">
                <Baustelle art={art} />
              </span>
              <span className="kachel-text">
                <strong>
                  <T>Kommt bald</T>
                </strong>
                <small>
                  <T>In Arbeit</T>
                </small>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
