/**
 * app/page.js – Startseite: erst die Wahl, was man spielen will (Wunsch von Jonas)
 *
 * Kacheln wie Spielmodi: „Weltkarte“ führt in die Karten-Erkundung (/karte), „Wissensquiz“ zu
 * allgemeinen Wissensfragen mit vier Antworten (/wissen), „Schätzen“ zu Fragen mit einer Zahl als
 * Antwort (/schaetzen), die übrigen sind Baustellen
 * („Kommt bald“) mit Comic-Figuren, die daran arbeiten (components/Baustelle.js).
 * Keine Begrüßung, keine Bedienhinweise – nur Fakten; erklärt wird hinter dem „?“.
 */
import Link from 'next/link';
import { alleKnoten, baum, weltSkizze } from '@/lib/gebiete';
import Baustelle from '@/components/Baustelle';
import { WISSENSFRAGEN } from '@/lib/wissensfragen';
import { SCHAETZFRAGEN } from '@/lib/schaetzfragen';
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
        <li>
          <Link href="/wissen" className="kachel kachel-wissen">
            <span className="kachel-bild">
              <span className="wissen-bild" aria-hidden="true">
                <svg viewBox="0 0 220 130">
                  <rect x="20" y="8" width="180" height="34" rx="8" className="wb-frage" />
                  <path d="M104 18a8 8 0 1 1 12 7c-2 1.5-2 3-2 5M114 35v.5" className="wb-zeichen" />
                  {[
                    [20, 54, 'wb-a'],
                    [114, 54, 'wb-b'],
                    [20, 92, 'wb-b'],
                    [114, 92, 'wb-b'],
                  ].map(([x, y, k], i) => (
                    <g key={i}>
                      <rect x={x} y={y} width="86" height="30" rx="8" className={k} />
                      <rect x={x + 7} y={y + 7} width="16" height="16" rx="4" className="wb-buchstabe" />
                      <rect x={x + 30} y={y + 13} width={36 - i * 4} height="4" rx="2" className="wb-zeile" />
                    </g>
                  ))}
                </svg>
              </span>
            </span>
            <span className="kachel-text">
              <strong>
                <T>Wissensquiz</T>
              </strong>
              <small>
                <T text="{n} Fragen · 4 Antworten" werte={{ n: WISSENSFRAGEN.length }} />
              </small>
            </span>
            <Chevron />
          </Link>
        </li>
        <li>
          <Link href="/schaetzen" className="kachel kachel-schaetzen">
            <span className="kachel-bild">
              <span className="wissen-bild schaetz-bild" aria-hidden="true">
                <svg viewBox="0 0 220 130">
                  <path d="M20 92h180" className="sb-strahl" />
                  {[20, 56, 92, 128, 164, 200].map((x) => (
                    <path key={x} d={`M${x} 84v16`} className="sb-strich" />
                  ))}
                  <path d="M82 70q30-40 60 0" className="sb-bogen" />
                  <path d="M82 76l-12-22h24z" className="sb-tipp" />
                  <path d="M142 76l-12-22h24z" className="sb-ziel" />
                  <rect x="64" y="22" width="36" height="24" rx="6" className="sb-tipp" />
                  <rect x="124" y="22" width="36" height="24" rx="6" className="sb-ziel" />
                </svg>
              </span>
            </span>
            <span className="kachel-text">
              <strong>
                <T>Schätzen</T>
              </strong>
              <small>
                <T text="{n} Fragen · je näher, desto mehr Punkte" werte={{ n: SCHAETZFRAGEN.length }} />
              </small>
            </span>
            <Chevron />
          </Link>
        </li>
        {[0].map((art) => (
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
