'use client';
/**
 * app/karte/QuizListe.js – alle Quizze aller Gebiete, links neben der Karte
 *
 * Eingeklappt ein schmaler Streifen mit Symbol; aufgeklappt (wie die Seitenleiste auf dem iPad)
 * eine Liste in Kartenreihenfolge (Welt, Kontinent, seine Länder …). Jedes Gebiet ist eine kurze
 * Zeile mit Zeichen (Globus, Umriss des Kontinents bzw. Bundeslands, Flagge des Landes); ein Klick
 * klappt seine Quizze als kompakte Knöpfe auf. Offen ist anfangs nur das aktuelle Gebiet, bei
 * einer Suche jedes Gebiet mit Treffern.
 * Filter: Art (Quizze, Weitere, Am nächsten dran) und Land (ein Land mit seinen Bundesländern).
 * Suche: Gebiet und Quiz, beide Sprachen, ohne Akzente.
 * Ein Klick auf ein Quiz fliegt ins Gebiet und startet es (onWahl in Erkundung.js).
 * Die Daten (/karte-daten/quizliste) werden erst beim ersten Aufklappen geladen.
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Chevron, Lupe, Seitenleiste } from '@/components/Symbole';
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

/** Zeichen eines Gebiets: Globus (Welt), Flagge (Land), Umriss (Kontinent, Bundesland) */
function Zeichen({ gebiet }) {
  if (gebiet.ebene === 'land') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="ql-zeichen flagge" src={`/flaggen/${gebiet.id.toLowerCase()}.svg`} alt="" loading="lazy" />;
  }
  if (gebiet.form) {
    return (
      <svg className="ql-zeichen umriss" viewBox="0 0 24 24" aria-hidden="true">
        <path d={gebiet.form} />
      </svg>
    );
  }
  return (
    <svg className="ql-zeichen globus" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18" />
    </svg>
  );
}

export default function QuizListe({ offen, onOffen, aktuell, bestwerte, mitDistanz = true, onWahl }) {
  const t = useT();
  const [daten, setDaten] = useState(speicher);
  const [suche, setSuche] = useState('');
  const [filter, setFilter] = useState('alle');
  const [land, setLand] = useState('');
  const [auf, setAuf] = useState(() => new Set([aktuell]));
  const verzoegert = useDeferredValue(suche);
  const listeRef = useRef(null);
  const sucheRef = useRef(null);

  useEffect(() => {
    if (!offen || daten) return undefined;
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

  // Beim Aufklappen: aktuelles Gebiet offen und im Blick, Suchfeld bereit
  useEffect(() => {
    if (!offen) return;
    setAuf((alt) => new Set([...alt, aktuell]));
  }, [offen, aktuell]);
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

  const laender = useMemo(
    () => (daten ?? []).filter((g) => g.ebene === 'land').sort((a, b) => t.ortsname(a).localeCompare(t.ortsname(b), t.sprache)),
    [daten, t],
  );

  const gruppen = useMemo(() => {
    if (!daten) return [];
    const woerter = einfach(verzoegert).split(/\s+/).filter(Boolean);
    return daten
      .filter((g) => !land || g.id === land || (g.ebene === 'region' && g.land === land))
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
  }, [daten, verzoegert, filter, land, mitDistanz]);

  const suchtGerade = verzoegert.trim().length > 0 || Boolean(land);
  const umschalten = (id) =>
    setAuf((alt) => {
      const neu = new Set(alt);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });

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
      <div className="ql-filter">
        <div className="ql-chips" role="radiogroup" aria-label={t('Art')}>
          {FILTER.filter(([wert]) => mitDistanz || wert !== 'distanz').map(([wert, text]) => (
            <button key={wert} type="button" role="radio" aria-checked={filter === wert} className={filter === wert ? 'gewaehlt' : undefined} onClick={() => setFilter(wert)}>
              {t(text)}
            </button>
          ))}
        </div>
        <label className={`ql-land${land ? ' gewaehlt' : ''}`}>
          <span className="unsichtbar">{t('Land')}</span>
          <select value={land} onChange={(e) => setLand(e.target.value)} aria-label={t('Land')}>
            <option value="">{t('Alle Länder')}</option>
            {laender.map((g) => (
              <option key={g.id} value={g.id}>
                {t.ortsname(g)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="ql-liste" ref={listeRef}>
        {!daten && <div className="ql-laedt" aria-hidden="true" />}
        {daten && !gruppen.length && <p className="ql-leer">{t('Nichts gefunden')}</p>}
        {gruppen.map((g) => {
          const istAuf = suchtGerade || auf.has(g.id);
          return (
            <section key={g.id} data-gebiet={g.id} className={`ql-gebiet ebene-${g.ebene}${g.id === aktuell ? ' aktuell' : ''}${istAuf ? ' auf' : ''}`}>
              <button type="button" className="ql-gebiet-kopf" aria-expanded={istAuf} onClick={() => umschalten(g.id)}>
                <Zeichen gebiet={g} />
                <span className="ql-name">
                  {t.ortsname(g)}
                  {g.ober && <small>{t.ortsname(g.ober)}</small>}
                </span>
                <span className="ql-zahl">{g.saetze.length}</span>
                <Chevron />
              </button>
              {istAuf && (
                <div className="ql-quizze">
                  {g.saetze.map((s) =>
                    s.stufen ? (
                      <span key={s.id} className="ql-quiz stufig" role="group" aria-label={t.ortsname({ name: s.titel, en: s.titelEn })}>
                        <span className="ql-quiz-titel">{t.ortsname({ name: s.titel, en: s.titelEn })}</span>
                        {s.stufen.map((n) => (
                          <button key={n} type="button" onClick={() => onWahl(g.id, s, n)} aria-label={t('Die {n} größten Städte', { n })}>
                            {n}
                          </button>
                        ))}
                      </span>
                    ) : (
                      <button
                        key={s.id}
                        type="button"
                        className={`ql-quiz gruppe-${s.gruppe}`}
                        onClick={() => onWahl(g.id, s)}
                        title={bestwerte[s.bestenliste] ? t('Bestwert {q} %', { q: bestwerte[s.bestenliste].quote }) : undefined}
                      >
                        {t.ortsname({ name: s.titel, en: s.titelEn })}
                        {bestwerte[s.bestenliste] && <i className="ql-bestwert" aria-hidden="true" />}
                      </button>
                    ),
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
