'use client';
/**
 * app/wissen/WissensQuiz.js – Wissensquiz mit vier Antworten (Fragen in lib/wissensfragen.js)
 *
 * Zuerst die Wahl der Kategorie (Kacheln: „Alle Kategorien“ und je Kategorie mit Fragenzahl und Bestwert).
 * Eine Runde = 10 zufällige Fragen (erst im Browser gemischt – sonst Hydration-Fehler), Antworten
 * ebenfalls gemischt. Antwort per Klick oder Taste 1–4 / A–D. Richtig: grün + Ton, falsch: rot, die
 * richtige leuchtet grün; danach „Weiter“ (Enter). Serie = richtige Antworten am Stück.
 * Ergebnis mit Sternen (wie bei der Karte: ab 50/75/90 %), Bestwert im Browser bzw. Konto
 * (Schlüssel „wissen:allgemein“ für alle, sonst „wissen:<kategorie>“) und Statistik-Ereignisse.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { KATEGORIEN, WISSENSFRAGEN } from '@/lib/wissensfragen';
import { mischen, sterneFuer } from '@/components/karte/useQuizRunde';
import { bestwertSpeichern, bestwerteLesen } from '@/lib/bestwerte';
import { melden } from '@/lib/statistik';
import { klang } from '@/lib/ton';
import { dauer } from '@/components/Bestenliste';
import TonSchalter from '@/components/TonSchalter';
import { Chevron, Flamme, Stern } from '@/components/Symbole';
import { useT } from '@/lib/sprache';

const RUNDE = 10;
const BUCHSTABEN = ['A', 'B', 'C', 'D'];
const ALLE = 'alle';
const schluessel = (kat) => (kat === ALLE ? 'wissen:allgemein' : `wissen:${kat}`);
const fragenVon = (kat) => (kat === ALLE ? WISSENSFRAGEN : WISSENSFRAGEN.filter((f) => f.k === kat));

function neueRunde(kat) {
  return mischen(fragenVon(kat))
    .slice(0, RUNDE)
    .map((frage) => ({
      ...frage,
      antworten: mischen(frage.a.map((a, i) => ({ text: a, richtig: i === 0 }))),
    }));
}

export default function WissensQuiz() {
  const t = useT();
  const [kat, setKat] = useState(null); // null = Auswahl
  const [bestwerte, setBestwerte] = useState({});
  const [runde, setRunde] = useState(null);
  const [nr, setNr] = useState(0);
  const [wahl, setWahl] = useState(null); // Index der gewählten Antwort
  const [richtig, setRichtig] = useState(0);
  const [serie, setSerie] = useState(0);
  const [start, setStart] = useState(0);
  const [ende, setEnde] = useState(0);
  const [bestwert, setBestwert] = useState(null);
  const [impuls, setImpuls] = useState(null);
  const text = (paar) => (t.sprache === 'en' ? paar[1] : paar[0]);

  const starten = useCallback(
    (welche = kat) => {
      if (!welche) return;
      setKat(welche);
      setRunde(neueRunde(welche));
      setNr(0);
      setWahl(null);
      setRichtig(0);
      setSerie(0);
      setEnde(0);
      setStart(Date.now());
      setBestwert(bestwerteLesen()[schluessel(welche)] ?? null);
      const titel = welche === ALLE ? 'Wissensquiz' : `Wissensquiz: ${KATEGORIEN[welche].de}`;
      melden('quiz_start', {
        quiz: schluessel(welche),
        titel,
        quizart: 'auswahl',
      });
    },
    [kat],
  );

  const zurAuswahl = useCallback(() => {
    setKat(null);
    setRunde(null);
    setEnde(0);
  }, []);

  // Bestwerte für die Kacheln (erst im Browser lesbar)
  useEffect(() => {
    if (!kat) setBestwerte(bestwerteLesen());
  }, [kat]);

  const frage = runde?.[nr];
  const fertig = Boolean(ende);

  const antworten = useCallback(
    (i) => {
      if (!frage || wahl !== null || fertig) return;
      setWahl(i);
      const treffer = frage.antworten[i].richtig;
      setImpuls({ art: treffer ? 'richtig' : 'falsch', n: Date.now() });
      if (treffer) {
        setRichtig((r) => r + 1);
        setSerie((s) => s + 1);
        klang('richtig');
      } else {
        setSerie(0);
        klang('falsch');
      }
    },
    [frage, wahl, fertig],
  );

  const weiter = useCallback(() => {
    if (wahl === null || fertig) return;
    if (nr + 1 < runde.length) {
      setNr(nr + 1);
      setWahl(null);
      return;
    }
    const jetzt = Date.now();
    const sekunden = Math.max(1, Math.round((jetzt - start) / 1000));
    const quote = Math.round((100 * richtig) / runde.length);
    setEnde(jetzt);
    bestwertSpeichern(schluessel(kat), quote, sekunden);
    melden('quiz_ende', { quiz: schluessel(kat), quote, sekunden });
    setTimeout(() => klang('fertig'), 200);
  }, [wahl, fertig, nr, runde, start, richtig, kat]);

  // Tasten: 1–4 bzw. A–D antworten, Enter/Leertaste weiter
  useEffect(() => {
    const taste = (e) => {
      if (!runde || e.target.closest?.('input, textarea, select, dialog')) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') return zurAuswahl();
      const i = ['1', '2', '3', '4'].indexOf(k) >= 0 ? ['1', '2', '3', '4'].indexOf(k) : ['a', 'b', 'c', 'd'].indexOf(k);
      if (i >= 0 && wahl === null) antworten(i);
      else if ((k === 'enter' || k === ' ') && wahl !== null) {
        e.preventDefault();
        if (fertig) starten();
        else weiter();
      }
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [antworten, weiter, starten, zurAuswahl, runde, wahl, fertig]);

  const name = (id) => (id === ALLE ? t('Alle Kategorien') : t.sprache === 'en' ? KATEGORIEN[id].en : KATEGORIEN[id].de);

  if (!runde) {
    return (
      <div className="wissen">
        <header className="wissen-kopf">
          <h1>{t('Wissensquiz')}</h1>
          <span className="leise">{t('{n} Fragen', { n: WISSENSFRAGEN.length })}</span>
        </header>
        <div className="wissen-kategorien">
          {[ALLE, ...Object.keys(KATEGORIEN)].map((id) => {
            const b = bestwerte[schluessel(id)];
            const sterne = b ? sterneFuer(b.quote) : 0;
            return (
              <button key={id} type="button" className={`wissen-kat karte${id === ALLE ? ' alle' : ''}`} onClick={() => starten(id)}>
                <strong>{name(id)}</strong>
                <span className="leise">{t('{n} Fragen', { n: fragenVon(id).length })}</span>
                {b && (
                  <span className="wissen-kat-best">
                    <span className="mini-sterne" aria-label={t('{n} von 3 Sternen', { n: sterne })}>
                      {[0, 1, 2].map((i) => (
                        <Stern key={i} voll={i < sterne} />
                      ))}
                    </span>
                    {b.quote} %
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (fertig) {
    const quote = Math.round((100 * richtig) / runde.length);
    const sterne = sterneFuer(quote);
    const neuerBestwert = !bestwert || quote > bestwert.quote;
    return (
      <div className="wissen">
        <section className="wissen-karte karte wissen-ergebnis erscheinen">
          <p className="wissen-oben">{kat === ALLE ? t('Wissensquiz') : name(kat)}</p>
          <div className="sterne" aria-label={t('{n} von 3 Sternen', { n: sterne })}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`stern${i < sterne ? ' voll' : ''}`} style={{ '--i': i }}>
                <Stern voll={i < sterne} />
              </span>
            ))}
          </div>
          <p className="ergebnis-zahl">
            {richtig} / {runde.length}
          </p>
          <p className="leise">
            {quote} % · {dauer(Math.round((ende - start) / 1000))}
            {neuerBestwert ? ` · ${t('Neuer Bestwert!')}` : bestwert ? ` · ${t('Bestwert {q} %', { q: bestwert.quote })}` : ''}
          </p>
          <div className="wissen-knoepfe">
            <button type="button" className="knopf knopf-haupt" onClick={() => starten()}>
              {t('Nochmal')}
            </button>
            <button type="button" className="knopf knopf-zweit" onClick={zurAuswahl}>
              {t('Andere Kategorie')}
            </button>
            <Link href="/" className="knopf knopf-zweit">
              {t('Zur Startseite')}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const kategorie = KATEGORIEN[frage.k];
  return (
    <div className="wissen">
      <div className="wissen-stand">
        <button type="button" className="knopf knopf-zweit wissen-zurueck" onClick={zurAuswahl} aria-label={t('Kategorien')} title={t('Kategorien')}>
          <Chevron richtung="links" />
        </button>
        <span className="stand">
          <strong>{nr + 1}</strong> / {runde.length}
        </span>
        <span className="wissen-fortschritt" aria-hidden="true">
          <span
            style={{
              width: `${(100 * (nr + (wahl !== null ? 1 : 0))) / runde.length}%`,
            }}
          />
        </span>
        {serie >= 2 && (
          <span className="serie statisch" title={t('Serie')}>
            <Flamme />
            {serie}
          </span>
        )}
        <TonSchalter />
      </div>

      <section className={`wissen-karte karte${impuls ? ` impuls-${impuls.art}` : ''}`} key={`${nr}-${impuls?.n ?? 0}`} aria-live="polite">
        <p className="wissen-kategorie">{t.sprache === 'en' ? kategorie.en : kategorie.de}</p>
        <h1 className="wissen-frage">{t.sprache === 'en' ? frage.en : frage.de}</h1>
        <div className="wissen-antworten">
          {frage.antworten.map((a, i) => {
            const zustand = wahl === null ? '' : a.richtig ? ' richtig' : i === wahl ? ' falsch' : ' aus';
            return (
              <button key={i} type="button" className={`wissen-antwort${zustand}`} onClick={() => antworten(i)} disabled={wahl !== null}>
                <span className="buchstabe" aria-hidden="true">
                  {BUCHSTABEN[i]}
                </span>
                <span>{text(a.text)}</span>
              </button>
            );
          })}
        </div>
        <div className="wissen-unten">
          {wahl !== null && (
            <>
              <span className={`rueckmeldung ${frage.antworten[wahl].richtig ? 'richtig' : 'falsch'}`}>{frage.antworten[wahl].richtig ? t('Richtig!') : t('Leider falsch')}</span>
              <button type="button" className="knopf knopf-haupt" onClick={weiter} autoFocus>
                {nr + 1 < runde.length ? t('Weiter') : t('Ergebnis')}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
