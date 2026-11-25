'use client';
/**
 * app/schaetzen/SchaetzQuiz.js – „Schätzen“: Zahl tippen, je näher, desto mehr Punkte
 *
 * Eine Runde = 10 zufällige Fragen aus lib/schaetzfragen.js (erst im Browser gemischt). Je Frage
 * 0–100 Punkte (grün ab 75, gelb ab 35), Serie = grüne Tipps am Stück. Ergebnis: Punkte von 1000,
 * Sterne nach dem Schnitt (ab 50/75/90 %), Bestwert „schaetzen:alle“, Statistik-Ereignisse.
 * Enter gibt ab bzw. geht weiter.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SchaetzKarte from '@/components/SchaetzKarte';
import { SCHAETZFRAGEN, schaetzFarbe, schaetzPunkte } from '@/lib/schaetzfragen';
import { mischen, sterneFuer } from '@/components/karte/useQuizRunde';
import { bestwertSpeichern, bestwerteLesen } from '@/lib/bestwerte';
import { melden } from '@/lib/statistik';
import { klang } from '@/lib/ton';
import { dauer } from '@/components/Bestenliste';
import TonSchalter from '@/components/TonSchalter';
import { Flamme, Stern } from '@/components/Symbole';
import { useT } from '@/lib/sprache';

const RUNDE = 10;
const SCHLUESSEL = 'schaetzen:alle';

export default function SchaetzQuiz() {
  const t = useT();
  const [runde, setRunde] = useState(null);
  const [nr, setNr] = useState(0);
  const [tipps, setTipps] = useState([]); // je Frage { wert, punkte }
  const [serie, setSerie] = useState(0);
  const [start, setStart] = useState(0);
  const [ende, setEnde] = useState(0);
  const [bestwert, setBestwert] = useState(null);
  const [impuls, setImpuls] = useState(null);

  const starten = useCallback(() => {
    setRunde(mischen(SCHAETZFRAGEN).slice(0, RUNDE));
    setNr(0);
    setTipps([]);
    setSerie(0);
    setEnde(0);
    setImpuls(null);
    setStart(Date.now());
    setBestwert(bestwerteLesen()[SCHLUESSEL] ?? null);
    melden('quiz_start', { quiz: SCHLUESSEL, titel: 'Schätzen', quizart: 'schaetzen' });
  }, []);

  useEffect(() => {
    starten();
  }, [starten]);

  const frage = runde?.[nr];
  const tipp = tipps[nr];
  const fertig = Boolean(ende);
  const summe = tipps.reduce((n, x) => n + (x?.punkte ?? 0), 0);

  const tippen = useCallback(
    (wert) => {
      if (!frage || tipps[nr]) return;
      const punkte = schaetzPunkte(wert, frage);
      const farbe = schaetzFarbe(punkte);
      setTipps((alt) => {
        const neu = [...alt];
        neu[nr] = { wert, punkte };
        return neu;
      });
      setSerie((s) => (farbe === 'gruen' ? s + 1 : 0));
      setImpuls(farbe === 'rot' ? 'falsch' : 'richtig');
      klang(farbe === 'rot' ? 'falsch' : 'richtig');
    },
    [frage, tipps, nr],
  );

  const weiter = useCallback(() => {
    if (!tipps[nr] || fertig) return;
    setImpuls(null);
    if (nr + 1 < runde.length) {
      setNr(nr + 1);
      return;
    }
    const jetzt = Date.now();
    const sekunden = Math.max(1, Math.round((jetzt - start) / 1000));
    const quote = Math.round(summe / runde.length);
    setEnde(jetzt);
    bestwertSpeichern(SCHLUESSEL, quote, sekunden);
    melden('quiz_ende', { quiz: SCHLUESSEL, quote, sekunden });
    setTimeout(() => klang('fertig'), 200);
  }, [tipps, nr, fertig, runde, start, summe]);

  // Enter: weiter bzw. nochmal (Abgeben erledigt das Formular)
  useEffect(() => {
    const taste = (e) => {
      if (e.key !== 'Enter' || e.target.closest?.('input, textarea, select, dialog')) return;
      e.preventDefault();
      if (fertig) starten();
      else if (tipps[nr]) weiter();
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [fertig, tipps, nr, weiter, starten]);

  if (!runde) return <div className="wissen" aria-busy="true" />;

  if (fertig) {
    const quote = Math.round(summe / runde.length);
    const sterne = sterneFuer(quote);
    const neuerBestwert = !bestwert || quote > bestwert.quote;
    return (
      <div className="wissen">
        <section className="wissen-karte karte wissen-ergebnis erscheinen">
          <p className="wissen-oben">{t('Schätzen')}</p>
          <div className="sterne" aria-label={t('{n} von 3 Sternen', { n: sterne })}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`stern${i < sterne ? ' voll' : ''}`} style={{ '--i': i }}>
                <Stern voll={i < sterne} />
              </span>
            ))}
          </div>
          <p className="ergebnis-zahl">
            {summe} / {runde.length * 100}
          </p>
          <p className="leise">
            {dauer(Math.round((ende - start) / 1000))}
            {neuerBestwert ? ` · ${t('Neuer Bestwert!')}` : bestwert ? ` · ${t('Bestwert {q} %', { q: bestwert.quote })}` : ''}
          </p>
          <div className="wissen-knoepfe">
            <button type="button" className="knopf knopf-haupt" onClick={starten}>
              {t('Nochmal')}
            </button>
            <Link href="/" className="knopf knopf-zweit">
              {t('Zur Startseite')}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="wissen">
      <div className="wissen-stand">
        <span className="stand">
          <strong>{nr + 1}</strong> / {runde.length}
        </span>
        <span className="wissen-fortschritt" aria-hidden="true">
          <span style={{ width: `${(100 * (nr + (tipp ? 1 : 0))) / runde.length}%` }} />
        </span>
        <span className="schaetz-summe">{t('{n} Punkte', { n: summe })}</span>
        {serie >= 2 && (
          <span className="serie statisch" title={t('Serie')}>
            <Flamme />
            {serie}
          </span>
        )}
        <TonSchalter />
      </div>

      <SchaetzKarte
        key={nr}
        frage={frage}
        onTipp={tippen}
        eigenerTipp={tipp}
        aufgeloest={Boolean(tipp)}
        impuls={impuls}
        kopf={<p className="wissen-kategorie">{t('Schätzen')}</p>}
        unten={
          tipp && (
            <div className="wissen-unten">
              <span />
              <button type="button" className="knopf knopf-haupt" onClick={weiter} autoFocus>
                {nr + 1 < runde.length ? t('Weiter') : t('Ergebnis')}
              </button>
            </div>
          )
        }
      />
    </div>
  );
}
