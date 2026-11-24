'use client';
/**
 * KontinentSpiel.js – Spiel „Länder eines Kontinents“ (läuft im Browser)
 *
 * Ablauf:
 *  1. Alle Länder des Kontinents werden gemischt. Oben steht der Name des gesuchten Landes.
 *  2. Klick auf das richtige Land:
 *       beim ersten Versuch → grün, beim zweiten oder dritten → gelb.
 *     Klick auf ein falsches Land: Versuch zählt (ein Punkt unter dem Namen färbt sich rot),
 *     kurz erscheint, welches Land angeklickt wurde.
 *     Nach dem dritten Fehlversuch wird das gesuchte Land rot aufgedeckt (blinkt kurz),
 *     danach geht es automatisch weiter.
 *  3. Sind alle Länder durch: Ergebnis, Bestenliste, Karte zum Nachschauen (Namen beim Darüberfahren).
 *
 * Wertung: grün zählt voll, gelb halb, rot nichts. Ergebnis in Prozent (0–100), bei
 * Gleichstand entscheidet die Zeit. In der Bestenliste steht es als punkte = Prozent, fragen = 100.
 *
 * Klicks auf bereits gelöste Länder zählen nicht, zeigen aber deren Namen.
 * Die Reihenfolge wird erst im Browser gemischt (useEffect), sonst Hydration-Fehler.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import KontinentKarte from '@/components/karte/KontinentKarte';
import Bestenliste, { dauer } from '@/components/Bestenliste';
import TonSchalter from '@/components/TonSchalter';
import { Chevron } from '@/components/Symbole';
import { klang } from '@/lib/ton';
import { bestenlistenName } from '@/lib/geodaten/kontinente';
import { bestwertSpeichern } from '@/lib/bestwerte';
import { useT } from '@/lib/sprache';

const VERSUCHE = 3;
const AUFGEDECKT_PAUSE = 1500; // ms, so lange bleibt das aufgedeckte Land im Blick
const RUECKMELDUNG_DAUER = 1600;

/** Mischt eine Liste zufällig (Fisher-Yates) und gibt eine neue Liste zurück. */
function mischen(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

/** Trefferquote in Prozent: grün voll, gelb halb */
function quote(ergebnis, anzahl) {
  const werte = Object.values(ergebnis);
  const gruen = werte.filter((w) => w === 'gruen').length;
  const gelb = werte.filter((w) => w === 'gelb').length;
  return Math.round((100 * (gruen + gelb / 2)) / anzahl);
}

export default function KontinentSpiel({ karte }) {
  const t = useT();
  const anzahl = karte.laender.length;
  const namen = useMemo(() => new Map(karte.laender.map((l) => [l.id, t.ortsname(l)])), [karte, t]);

  // spiel: { reihenfolge, nummer, fehl, ergebnis: { id → farbe }, start, ende, sperre }
  const [spiel, setSpiel] = useState(null);
  const [rueckmeldung, setRueckmeldung] = useState(null); // { art, text, schluessel }
  const [effekt, setEffekt] = useState(null); // { id, art: 'daneben' | 'puls' }
  const timer = useRef({});
  const spielRef = useRef(null); // aktueller Stand für verzögerte Schritte (setTimeout)
  spielRef.current = spiel;

  const spaeter = useCallback((name, fn, ms) => {
    clearTimeout(timer.current[name]);
    timer.current[name] = setTimeout(fn, ms);
  }, []);

  const starten = useCallback(() => {
    Object.values(timer.current).forEach(clearTimeout);
    setSpiel({
      reihenfolge: mischen(karte.laender.map((l) => l.id)),
      nummer: 0,
      fehl: 0,
      ergebnis: {},
      start: Date.now(),
      ende: 0,
      sperre: false,
    });
    setRueckmeldung(null);
    setEffekt(null);
  }, [karte]);

  useEffect(() => {
    starten();
    const laufend = timer.current;
    return () => Object.values(laufend).forEach(clearTimeout);
  }, [starten]);

  const melden = useCallback(
    (art, text) => {
      setRueckmeldung({ art, text, schluessel: Date.now() });
      if (art !== 'aufgedeckt') spaeter('rueckmeldung', () => setRueckmeldung(null), RUECKMELDUNG_DAUER);
    },
    [spaeter],
  );

  /** Nächstes Land – oder Spielende */
  const weiter = useCallback(
    (stand) => {
      const nummer = stand.nummer + 1;
      if (nummer < stand.reihenfolge.length) return { ...stand, nummer, fehl: 0, sperre: false };
      const ende = Date.now();
      const sekunden = Math.max(1, Math.round((ende - stand.start) / 1000));
      bestwertSpeichern(karte.slug, quote(stand.ergebnis, anzahl), sekunden);
      setTimeout(() => klang('fertig'), 250);
      return { ...stand, nummer, fehl: 0, sperre: false, ende };
    },
    [karte.slug, anzahl],
  );

  function landGeklickt(id) {
    if (!spiel || spiel.ende || spiel.sperre) return;
    const ziel = spiel.reihenfolge[spiel.nummer];

    if (spiel.ergebnis[id]) return melden('info', namen.get(id)); // schon gelöst: nur Name zeigen

    if (id === ziel) {
      klang('richtig');
      setRueckmeldung(null);
      setEffekt(null);
      const farbe = spiel.fehl === 0 ? 'gruen' : 'gelb';
      setSpiel(weiter({ ...spiel, ergebnis: { ...spiel.ergebnis, [ziel]: farbe } }));
      return;
    }

    // Daneben
    klang('falsch');
    const fehl = spiel.fehl + 1;
    setEffekt({ id, art: 'daneben' });
    spaeter('effekt', () => setEffekt(null), 650);

    if (fehl < VERSUCHE) {
      setSpiel({ ...spiel, fehl });
      melden('falsch', namen.get(id));
      return;
    }

    // Dritter Fehlversuch: gesuchtes Land rot aufdecken, kurz zeigen, dann weiter
    const aufgedeckt = { ...spiel, fehl, sperre: true, ergebnis: { ...spiel.ergebnis, [ziel]: 'rot' } };
    setSpiel(aufgedeckt);
    melden('aufgedeckt', t('Aufgedeckt'));
    setTimeout(() => klang('aufgedeckt'), 140);
    spaeter('effekt', () => setEffekt({ id: ziel, art: 'puls' }), 0);
    spaeter(
      'weiter',
      () => {
        setEffekt(null);
        setRueckmeldung(null);
        setSpiel(weiter(spielRef.current));
      },
      AUFGEDECKT_PAUSE,
    );
  }

  const ergebnis = spiel?.ergebnis ?? {};
  const fertig = Boolean(spiel?.ende);
  const ziel = spiel && !fertig ? spiel.reihenfolge[spiel.nummer] : null;
  const zaehlen = (farbe) => Object.values(ergebnis).filter((w) => w === farbe).length;
  const gruen = zaehlen('gruen');
  const gelb = zaehlen('gelb');
  const rot = zaehlen('rot');
  const erledigt = gruen + gelb + rot;

  const namenZeigen = useCallback((id) => fertig || Boolean(ergebnis[id]), [fertig, ergebnis]);

  return (
    <div className="spiel" style={{ '--verhaeltnis': karte.breite / karte.hoehe }}>
      <div className="spielleiste">
        <div className="spielleiste-links">
          <Link href="/kontinente" className="zurueck">
            <Chevron richtung="links" className="" />
            {t('Kontinente')}
          </Link>
        </div>

        <div className="frage" aria-live="polite">
          {fertig ? (
            <h1 className="frage-name">{t.ortsname(karte)}</h1>
          ) : (
            <>
              <h1 className="frage-name" key={ziel ?? 'leer'}>
                {ziel ? namen.get(ziel) : ' '}
              </h1>
              <div className="frage-unter">
                <span className="versuche" aria-label={t('{n} von {m} Versuchen übrig', { n: VERSUCHE - (spiel?.fehl ?? 0), m: VERSUCHE })}>
                  {Array.from({ length: VERSUCHE }, (_, i) => (
                    <i key={i} className={i < (spiel?.fehl ?? 0) ? 'verbraucht' : undefined} />
                  ))}
                </span>
                {rueckmeldung && (
                  <span key={rueckmeldung.schluessel} className={`rueckmeldung ${rueckmeldung.art}`}>
                    {rueckmeldung.text}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="spielleiste-rechts">
          <span className="stand">
            <strong>{Math.min(erledigt + (fertig ? 0 : 1), anzahl)}</strong> / {anzahl}
          </span>
          <TonSchalter />
        </div>
      </div>

      <div className="fortschritt" aria-hidden="true">
        <span className="f-gruen" style={{ width: `${(100 * gruen) / anzahl}%` }} />
        <span className="f-gelb" style={{ width: `${(100 * gelb) / anzahl}%` }} />
        <span className="f-rot" style={{ width: `${(100 * rot) / anzahl}%` }} />
      </div>

      {fertig && (
        <Ergebnis
          karte={karte}
          spiel={spiel}
          zahlen={{ gruen, gelb, rot }}
          namen={namen}
          onNochmal={() => {
            starten();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      <KontinentKarte
        karte={karte}
        zustand={ergebnis}
        effekt={effekt}
        offen={Boolean(spiel) && !fertig && !spiel.sperre}
        namenZeigen={namenZeigen}
        onLand={landGeklickt}
      />
    </div>
  );
}

function Ergebnis({ karte, spiel, zahlen, namen, onNochmal }) {
  const t = useT();
  const anzahl = karte.laender.length;
  const prozent = quote(spiel.ergebnis, anzahl);
  const sekunden = Math.max(1, Math.round((spiel.ende - spiel.start) / 1000));
  const aufgedeckt = spiel.reihenfolge.filter((id) => spiel.ergebnis[id] === 'rot').map((id) => namen.get(id));
  aufgedeckt.sort((a, b) => a.localeCompare(b, t.sprache));

  return (
    <div className="ergebnis">
      <section className="karte erscheinen">
        <p className="eyebrow">{t('Ergebnis')}</p>
        <p className="ergebnis-zahl">
          {prozent}
          <small>%</small>
        </p>
        <p className="zeit">{dauer(sekunden)} min</p>
        <ul className="bilanz">
          <li>
            <span className="farbpunkt gruen" /> <b>{zahlen.gruen}</b> {t('beim ersten Versuch')}
          </li>
          <li>
            <span className="farbpunkt gelb" /> <b>{zahlen.gelb}</b> {t('beim zweiten oder dritten Versuch')}
          </li>
          <li>
            <span className="farbpunkt rot" /> <b>{zahlen.rot}</b> {t('aufgedeckt')}
          </li>
        </ul>
        <div className="ergebnis-knoepfe">
          <button type="button" className="knopf knopf-haupt" onClick={onNochmal}>
            {t('Noch einmal')}
          </button>
          <Link href="/kontinente" className="knopf knopf-zweit">
            {t('Anderer Kontinent')}
          </Link>
        </div>
        {aufgedeckt.length > 0 && (
          <p className="verpasst">
            {t('Aufgedeckt')}: <strong>{aufgedeckt.join(', ')}</strong>
          </p>
        )}
      </section>

      <section className="karte erscheinen" style={{ '--i': 1 }}>
        <Bestenliste
          quiz={bestenlistenName(karte.slug)}
          punkte={prozent}
          fragen={100}
          sekunden={sekunden}
          wertText={(e) => `${e.punkte} %`}
        />
      </section>
    </div>
  );
}
