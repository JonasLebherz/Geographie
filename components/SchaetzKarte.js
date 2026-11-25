'use client';
/**
 * components/SchaetzKarte.js – eine Schätzfrage: Zahl eintippen, danach die Auflösung
 *
 * Gemeinsam für das Solo-Spiel (app/schaetzen) und die Party (app/party/[code]/FragenParty.js).
 * Eingabe als Text (Komma und Punkt erlaubt, lib/schaetzfragen.js `zahlLesen`), Enter gibt ab.
 * Aufgelöst: richtige Zahl groß, darunter der eigene Tipp mit Punkten (Balken in Grün/Gelb/Rot)
 * und – in der Party – die Tipps aller, sortiert nach Punkten.
 */
import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { schaetzFarbe, zahlLesen, zahlZeigen } from '@/lib/schaetzfragen';
import { useT } from '@/lib/sprache';

export default function SchaetzKarte({ frage, onTipp, gesperrt = false, eigenerTipp, aufgeloest = false, tipps = null, kopf = null, unten = null, impuls = null }) {
  const t = useT();
  const [eingabe, setEingabe] = useState('');
  const feld = useRef(null);
  const sprache = t.sprache;
  const einheit = frage.j ? '' : sprache === 'en' ? frage.e[1] : frage.e[0];
  const wert = zahlLesen(eingabe, sprache);
  const abgegeben = eigenerTipp !== undefined;

  useEffect(() => {
    setEingabe('');
    feld.current?.focus();
  }, [frage]);

  function abgeben(e) {
    e.preventDefault();
    if (wert === null || abgegeben || gesperrt) return;
    onTipp(wert);
  }

  const zeig = (n) => zahlZeigen(n, sprache, frage.j);
  const punkte = (p) => (p === null || p === undefined ? '–' : p);

  return (
    <section className={`wissen-karte karte schaetz-karte${impuls ? ` impuls-${impuls}` : ''}`} aria-live="polite">
      {kopf}
      <h1 className="wissen-frage">{sprache === 'en' ? frage.en : frage.de}</h1>

      {!aufgeloest ? (
        <form className="schaetz-eingabe" onSubmit={abgeben} noValidate>
          <label className="schaetz-feld">
            <input
              ref={feld}
              value={abgegeben ? (eigenerTipp.wert === null ? '' : zahlZeigen(eigenerTipp.wert, sprache, frage.j)) : eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              placeholder={frage.j ? t('Jahr') : '0'}
              aria-label={frage.j ? t('Jahr') : t('Deine Schätzung')}
              disabled={abgegeben || gesperrt}
              autoFocus
            />
            {einheit && <span className="schaetz-einheit">{einheit}</span>}
          </label>
          <button className="knopf knopf-haupt" disabled={wert === null || abgegeben || gesperrt}>
            {t('Tipp abgeben')}
          </button>
        </form>
      ) : (
        <div className="schaetz-aufloesung erscheinen">
          <p className="schaetz-richtig">
            <strong>{zeig(frage.z)}</strong>
            {einheit && <span>{einheit}</span>}
          </p>
          {tipps ? (
            <ol className="schaetz-tipps">
              {tipps.map((tp) => (
                <li key={tp.id} className={tp.ich ? 'ich' : undefined}>
                  <Avatar wert={tp.avatar} groesse={30} />
                  <span className="schaetz-name">{tp.name}</span>
                  <span className="schaetz-wert">{tp.wert === null ? '–' : zeig(tp.wert)}</span>
                  <span className={`schaetz-punkte ${schaetzFarbe(tp.punkte ?? 0)}`}>{punkte(tp.punkte)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <MeinTipp tipp={eigenerTipp} frage={frage} zeig={zeig} />
          )}
        </div>
      )}
      {unten}
    </section>
  );
}

function MeinTipp({ tipp, frage, zeig }) {
  const t = useT();
  const p = tipp?.punkte ?? 0;
  return (
    <div className="schaetz-mein">
      <span className="leise">
        {t('Dein Tipp')}: <strong>{tipp?.wert === null || tipp?.wert === undefined ? '–' : zeig(tipp.wert)}</strong>
      </span>
      <span className="schaetz-balken" aria-hidden="true">
        <span className={schaetzFarbe(p)} style={{ width: `${p}%` }} />
      </span>
      <span className={`schaetz-punkte ${schaetzFarbe(p)}`}>{t('{n} Punkte', { n: p })}</span>
      {frage.j && tipp?.wert !== null && tipp?.wert !== undefined && tipp.wert !== frage.z && (
        <span className="leise">{t('{n} Jahre daneben', { n: Math.abs(tipp.wert - frage.z) })}</span>
      )}
    </div>
  );
}
