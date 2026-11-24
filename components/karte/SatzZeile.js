'use client';
/**
 * components/karte/SatzZeile.js – eine Zeile einer Quiz-Liste (rechte Leiste und Quiz-Liste links)
 *
 * Titel, Anzahl (bzw. „30 von 400“), Bestwert. Städte mit Wahl der Größe: die 10, 50 oder 100
 * größten – jede Stufe ist ein eigener Knopf mit eigener Bestenliste.
 */
import { Chevron } from '@/components/Symbole';
import { useT } from '@/lib/sprache';

/** Eine Zeile der Quiz-Liste; Städte mit Wahl der Größe (die 10, 50, 100 größten) */
export default function SatzZeile({ satz: s, bestwerte, laedt, onQuiz }) {
  const t = useT();
  const titel = t.ortsname({ name: s.titel, en: s.titelEn });
  if (s.stufen) {
    return (
      <li className="stufen-zeile">
        <span className="titel">{titel}</span>
        <span className="stufen" role="group" aria-label={titel}>
          {s.stufen.map((n) => {
            const bestwert = bestwerte[`${s.bestenliste}-${n}`];
            return (
              <button
                key={n}
                type="button"
                className={laedt === s.id ? 'laedt' : undefined}
                onClick={() => onQuiz(s, n)}
                aria-label={t('Die {n} größten Städte', { n })}
                title={bestwert ? t('Bestwert {q} %', { q: bestwert.quote }) : undefined}
              >
                {n}
                {bestwert && <i className="stufe-bestwert" aria-hidden="true" />}
              </button>
            );
          })}
        </span>
      </li>
    );
  }
  const bestwert = bestwerte[s.bestenliste];
  return (
    <li>
      <button type="button" className={`listen-zeile${laedt === s.id ? ' laedt' : ''}`} onClick={() => onQuiz(s)}>
        <span className="titel">{titel}</span>
        <span className="zusatz">
          {s.runde < s.anzahl ? t('{r} von {n}', { r: s.runde, n: t.zahl(s.anzahl) }) : t.zahl(s.anzahl)}
          {bestwert && <small>{t('Bestwert {q} %', { q: bestwert.quote })}</small>}
        </span>
        <Chevron />
      </button>
    </li>
  );
}
