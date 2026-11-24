'use client';
/**
 * app/karte/QuizListe.js – alle Quizze aller Gebiete, links neben der Karte
 *
 * Eingeklappt ein schmaler Streifen mit Symbol; aufgeklappt (wie die Seitenleiste auf dem iPad)
 * eine große Liste – die Karte rückt dafür nach rechts und wird schmal. Gruppiert nach Gebiet in
 * Kartenreihenfolge (Welt, Kontinent, seine Länder …), mit Suche (Gebiet und Quiz, beide Sprachen,
 * ohne Akzente) und Filter nach Art (Quizze, weitere, „Am nächsten dran“).
 * Ein Klick fliegt ins Gebiet und startet dort das Quiz (siehe onWahl in Erkundung.js).
 * Die Daten (/karte-daten/quizliste) werden erst beim ersten Aufklappen geladen.
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import SatzZeile from '@/components/karte/SatzZeile';
import { Lupe, Seitenleiste } from '@/components/Symbole';
import { useT } from '@/lib/sprache';

const FILTER = [
  ['alle', 'Alle'],
  ['quiz', 'Quizze'],
  ['weitere', 'Weitere'],
  ['distanz', 'Am nächsten dran'],
];

/** Für die Suche: klein, ohne Akzente, ß → ss */
const einfach = (text) =>
  (text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

let speicher = null; // einmal geladen, für alle Ansichten

export default function QuizListe({ offen, onOffen, aktuell, bestwerte, mitDistanz = true, onWahl }) {
  const t = useT();
  const [daten, setDaten] = useState(speicher);
  const [suche, setSuche] = useState('');
  const [filter, setFilter] = useState('alle');
  const verzoegert = useDeferredValue(suche);
  const listeRef = useRef(null);
  const sucheRef = useRef(null);

  useEffect(() => {
    if (!offen || daten) return;
    let aus = false;
    fetch('/karte-daten/quizliste')
      .then((a) => a.json())
      .then((d) => {
        speicher = d;
        if (!aus) setDaten(d);
      })
      .catch(() => {});
    return () => {
      aus = true;
    };
  }, [offen, daten]);

  // Beim Aufklappen: zum aktuellen Gebiet scrollen, Suchfeld bereit
  useEffect(() => {
    if (!offen || !daten) return;
    const abschnitt = listeRef.current?.querySelector(`[data-gebiet="${aktuell}"]`);
    if (abschnitt && !suche) listeRef.current.scrollTop = abschnitt.offsetTop - 8;
    sucheRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen, daten]);

  // Esc klappt die Liste zu
  useEffect(() => {
    if (!offen) return undefined;
    const taste = (e) => {
      if (e.key === 'Escape' && !document.querySelector('.profil-menue')) {
        e.stopImmediatePropagation();
        onOffen(false);
      }
    };
    window.addEventListener('keydown', taste, true);
    return () => window.removeEventListener('keydown', taste, true);
  }, [offen, onOffen]);

  const gruppen = useMemo(() => {
    if (!daten) return [];
    const woerter = einfach(verzoegert).split(/\s+/).filter(Boolean);
    return daten
      .map((g) => {
        const gebiet = einfach(`${g.name} ${g.en} ${g.ober?.name ?? ''} ${g.ober?.en ?? ''}`);
        const saetze = g.saetze.filter((s) => {
          if (filter !== 'alle' && s.gruppe !== filter) return false;
          if (!mitDistanz && s.gruppe === 'distanz') return false;
          const text = `${gebiet} ${einfach(s.titel)} ${einfach(s.titelEn)}`;
          return woerter.every((w) => text.includes(w));
        });
        return { ...g, saetze };
      })
      .filter((g) => g.saetze.length);
  }, [daten, verzoegert, filter, mitDistanz]);

  if (!offen) {
    return (
      <aside className="quizliste" aria-label={t('Alle Quizze')}>
        <button type="button" className="quizliste-griff" onClick={() => onOffen(true)} aria-expanded="false">
          <Seitenleiste />
          <span className="griff-text">{t('Alle Quizze')}</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="quizliste offen" aria-label={t('Alle Quizze')}>
      <div className="ql-kopf">
        <h2>{t('Alle Quizze')}</h2>
        <button type="button" className="ql-zu" onClick={() => onOffen(false)} aria-expanded="true" aria-label={t('Liste schließen')} title={t('Liste schließen')}>
          <Seitenleiste />
        </button>
      </div>
      <label className="ql-suche">
        <Lupe />
        <input ref={sucheRef} type="search" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder={t('Suchen')} aria-label={t('Suchen')} />
      </label>
      <div className="ql-filter" role="radiogroup" aria-label={t('Art')}>
        {FILTER.filter(([wert]) => mitDistanz || wert !== 'distanz').map(([wert, text]) => (
          <button key={wert} type="button" role="radio" aria-checked={filter === wert} className={filter === wert ? 'gewaehlt' : undefined} onClick={() => setFilter(wert)}>
            {t(text)}
          </button>
        ))}
      </div>
      <div className="ql-liste" ref={listeRef}>
        {!daten && <div className="ql-laedt" aria-hidden="true" />}
        {daten && !gruppen.length && <p className="ql-leer">{t('Nichts gefunden')}</p>}
        {gruppen.map((g) => (
          <section key={g.id} data-gebiet={g.id} className={`ql-gebiet${g.id === aktuell ? ' aktuell' : ''}`}>
            <h3>
              {t.ortsname(g)}
              {g.ober && <small>{t.ortsname(g.ober)}</small>}
            </h3>
            <ul className="liste karte">
              {g.saetze.map((s) => (
                <SatzZeile key={s.id} satz={s} bestwerte={bestwerte} onQuiz={(satz, stufe) => onWahl(g.id, satz, stufe)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}
