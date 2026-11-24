'use client';
/**
 * app/karte/Willkommen.js – Begrüßung auf der Startseite (über der Weltkarte)
 *
 * Kurz erklärt, wie das Spiel geht (ausdrücklicher Wunsch – sonst gilt: keine Bedienhinweise),
 * dazu die Wahl: allein spielen oder mit Freunden (Party, 1 gegen 1).
 * „Solo“ schließt die Karte für diese Sitzung (sessionStorage), danach geht es direkt los.
 */
import Link from 'next/link';
import { useT } from '@/lib/sprache';
import { Gruppe, Spielen } from '@/components/Symbole';

export const WILLKOMMEN_GESEHEN = 'geo-quiz-willkommen';

export default function Willkommen({ onSolo }) {
  const t = useT();
  const schritte = [
    t('Gebiet auf der Karte anklicken – die Kamera fliegt hinein.'),
    t('Quiz wählen: Länder, Hauptstädte, Bundesländer …'),
    t('Gesuchtes auf der Karte finden. Drei Versuche je Frage.'),
  ];
  return (
    <div className="willkommen" role="dialog" aria-labelledby="willkommen-titel">
      <p className="willkommen-marke">Geo-Quiz</p>
      <h1 className="willkommen-titel" id="willkommen-titel">
        {t('Wo liegt das?')}
      </h1>
      <ol className="schritte">
        {schritte.map((text, i) => (
          <li key={i} style={{ '--i': i + 1 }}>
            <span className="schritt-nr">{i + 1}</span>
            {text}
          </li>
        ))}
      </ol>
      <div className="willkommen-knoepfe">
        <button type="button" className="knopf knopf-haupt knopf-gross" onClick={onSolo}>
          <Spielen />
          {t('Solo spielen')}
        </button>
        <Link href="/party" className="knopf knopf-zweit knopf-gross">
          <Gruppe />
          {t('Mit Freunden')}
        </Link>
      </div>
    </div>
  );
}
