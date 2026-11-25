'use client';
/**
 * app/karte/QuizListe.js – alle Quizze aller Gebiete, links neben der Karte
 *
 * Eingeklappt ein schmaler Streifen mit Symbol; aufgeklappt (wie die Seitenleiste auf dem iPad)
 * ein Baum: oben die Welt, darunter die Kontinente. Ein Kontinent klappt seine Quizze und seine
 * Länder auf; Länder mit eigenen Gebieten (Deutschland) klappen ihre Bundesländer mit auf, die
 * wiederum einzeln aufklappen.
 * Jedes Gebiet ist eine kurze Zeile mit Zeichen (Globus, EU-Flagge für Europa, Umriss des
 * Kontinents bzw. Bundeslands, Flagge des Landes); ein Klick klappt seine Quizze als kompakte
 * Knöpfe auf. Anfangs ist alles zu (nur der Weg zum aktuellen Gebiet ist offen), bei einer Suche
 * zeigt die Liste flach jedes Gebiet mit Treffern.
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
  if (gebiet.id === 'europa') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="ql-zeichen flagge" src="/flaggen/eu.svg" alt="" loading="lazy" />;
  }
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
  const [auf, setAuf] = useState(() => new Set());
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

  // Beim Aufklappen: der Weg zum aktuellen Gebiet ist offen (etwa Deutschland für ein Bundesland),
  // das Gebiet selbst bleibt zu und ist im Blick; Suchfeld bereit
  useEffect(() => {
    if (!offen || !daten) return;
    const nachId = new Map(daten.map((g) => [g.id, g]));
    const weg = [];
    for (let g = nachId.get(nachId.get(aktuell)?.eltern); g && g.ebene !== 'welt'; g = nachId.get(g.eltern)) weg.push(g.id);
    if (weg.length) setAuf((alt) => new Set([...alt, ...weg]));
  }, [offen, aktuell, daten]);
  const gescrollt = useRef(false);
  useEffect(() => {
    if (!offen) {
      gescrollt.current = false;
      return;
    }
    if (!daten || gescrollt.current) return;
    const liste = listeRef.current;
    const abschnitt = liste?.querySelector(`[data-gebiet="${aktuell}"]`);
    if (!abschnitt) return; // erst, wenn der Weg dorthin aufgeklappt ist
    gescrollt.current = true;
    if (!suche) liste.scrollTop = abschnitt.getBoundingClientRect().top - liste.getBoundingClientRect().top - 56;
    sucheRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen, daten, auf]);

  // Esc klappt die Liste zu
  useEffect(() => {
    if (!offen) return undefined;
    const taste = (e) => {
      if (e.key === 'Escape' && !document.querySelector('.profil-menue, .foto-gross')) {
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

  // Baum ohne Suche: Welt, Kontinente – darin ihre Länder (alphabetisch), darin die Bundesländer.
  // Ein Gebiet bleibt drin, wenn es selbst oder eines seiner Untergebiete zum Filter passt.
  const baumDaten = useMemo(() => {
    if (!daten) return null;
    const passend = new Map(gruppen.map((g) => [g.id, g]));
    const knotenVon = (g) => {
      const kinder = daten
        .filter((k) => k.eltern === g.id && k.ebene !== 'welt' && k.ebene !== 'kontinent')
        .map(knotenVon)
        .filter(Boolean)
        .sort((a, b) => t.ortsname(a).localeCompare(t.ortsname(b), t.sprache));
      const eigen = passend.get(g.id);
      if (!eigen && !kinder.length) return null;
      return { ...(eigen ?? { ...g, saetze: [] }), kinder };
    };
    return {
      welt: daten.filter((g) => g.ebene === 'welt').map(knotenVon).filter(Boolean),
      kontinente: daten.filter((g) => g.ebene === 'kontinent').map(knotenVon).filter(Boolean),
    };
  }, [daten, gruppen, t]);

  /** Eine Zeile mit ihren Quizzen und (bei Ländern mit eigenen Gebieten) den Untergebieten */
  const zeile = (g, flach = false) => {
    const istAuf = suchtGerade || auf.has(g.id);
    const kinder = flach ? [] : (g.kinder ?? []);
    return (
      <section key={g.id} data-gebiet={g.id} className={`ql-gebiet ebene-${g.ebene}${g.id === aktuell ? ' aktuell' : ''}${istAuf ? ' auf' : ''}${flach ? ' flach' : ''}`}>
        <button type="button" className="ql-gebiet-kopf" aria-expanded={istAuf} onClick={() => umschalten(g.id)}>
          <Zeichen gebiet={g} />
          <span className="ql-name">
            {t.ortsname(g)}
            {flach && g.ober && <small>{t.ortsname(g.ober)}</small>}
            {kinder.length > 0 && <small>{g.ebene === 'kontinent' ? t('{n} Länder', { n: kinder.length }) : t('{n} Bundesländer', { n: kinder.length })}</small>}
          </span>
          <span className="ql-zahl">{g.saetze.length || ''}</span>
          <Chevron />
        </button>
        {istAuf && g.saetze.length > 0 && (
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
        {istAuf && kinder.length > 0 && (
          <div className={`ql-unter unter-${g.ebene}`}>
            <h4 className="ql-unterabschnitt">{g.ebene === 'kontinent' ? t('Länder') : t('Bundesländer')}</h4>
            {kinder.map((k) => zeile(k))}
          </div>
        )}
      </section>
    );
  };

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
        {suchtGerade
          ? gruppen.map((g) => zeile(g, true))
          : baumDaten && (
              <>
                {baumDaten.welt.map((g) => zeile(g))}
                {baumDaten.kontinente.length > 0 && <h3 className="ql-abschnitt">{t('Kontinente')}</h3>}
                {baumDaten.kontinente.map((g) => zeile(g))}
              </>
            )}
      </div>
    </aside>
  );
}
