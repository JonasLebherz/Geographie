'use client';
/**
 * components/karte/useQuizRunde.js – Spiel-Logik einer Quiz-Runde auf der Karte
 *
 * Regeln (wie bisher im Modus „Länder eines Kontinents“):
 *  - Oben steht ein Name, gesucht ist die passende Fläche bzw. der passende Punkt.
 *  - Treffer beim ersten Versuch → grün, beim zweiten oder dritten → gelb.
 *  - Ein Fehlversuch zählt (Punkt unter dem Namen wird rot), kurz erscheint der Name des
 *    angeklickten Gebiets. Nach dem dritten Fehlversuch wird das Gesuchte rot aufgedeckt
 *    (Ring + 1,5 s Pause), dann geht es weiter.
 *  - Klicks auf schon gelöste Gebiete zählen nicht, zeigen aber deren Namen.
 *  - Wertung: grün voll, gelb halb → Prozent. Bei Gleichstand entscheidet die Zeit.
 *
 * Bei großen Sätzen (z. B. 4.439 Regionen der Welt) besteht eine Runde aus einer
 * Zufallsauswahl (runde < Anzahl). Gemischt wird erst im Browser (sonst Hydration-Fehler).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { klang } from '@/lib/ton';
import { bestwertSpeichern } from '@/lib/bestwerte';
import { useT } from '@/lib/sprache';

export const VERSUCHE = 3;
const AUFGEDECKT_PAUSE = 1500;
const RUECKMELDUNG_DAUER = 1600;

function mischen(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

/** Trefferquote in Prozent: grün voll, gelb halb */
export function quote(ergebnis, anzahl) {
  const werte = Object.values(ergebnis);
  const gruen = werte.filter((w) => w === 'gruen').length;
  const gelb = werte.filter((w) => w === 'gelb').length;
  return Math.round((100 * (gruen + gelb / 2)) / anzahl);
}

/**
 * einheiten:   [{ id, name, en, … }] – alles, was auf der Karte anklickbar ist
 * runde:       wie viele davon in einer Runde gefragt werden
 * bestenliste: Schlüssel für Bestwert und Bestenliste
 */
export function useQuizRunde({ einheiten, runde, bestenliste }) {
  const t = useT();
  const namen = useMemo(() => new Map(einheiten.map((e) => [e.id, t.ortsname(e)])), [einheiten, t]);
  const [spiel, setSpiel] = useState(null);
  const [rueckmeldung, setRueckmeldung] = useState(null); // { art, text, schluessel }
  const [effekt, setEffekt] = useState(null); // { id, art: 'daneben' | 'puls' }
  const timer = useRef({});
  const spielRef = useRef(null);
  spielRef.current = spiel;

  const spaeter = useCallback((name, fn, ms) => {
    clearTimeout(timer.current[name]);
    timer.current[name] = setTimeout(fn, ms);
  }, []);

  const starten = useCallback(() => {
    Object.values(timer.current).forEach(clearTimeout);
    const ids = mischen(einheiten.map((e) => e.id)).slice(0, Math.min(runde, einheiten.length));
    setSpiel({ reihenfolge: ids, nummer: 0, fehl: 0, ergebnis: {}, start: Date.now(), ende: 0, sperre: false });
    setRueckmeldung(null);
    setEffekt(null);
  }, [einheiten, runde]);

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

  /** Nächste Frage – oder Ende der Runde */
  const weiter = useCallback(
    (stand) => {
      const nummer = stand.nummer + 1;
      if (nummer < stand.reihenfolge.length) return { ...stand, nummer, fehl: 0, sperre: false };
      const ende = Date.now();
      const sekunden = Math.max(1, Math.round((ende - stand.start) / 1000));
      bestwertSpeichern(bestenliste, quote(stand.ergebnis, stand.reihenfolge.length), sekunden);
      setTimeout(() => klang('fertig'), 250);
      return { ...stand, nummer, fehl: 0, sperre: false, ende };
    },
    [bestenliste],
  );

  const klick = useCallback(
    (id) => {
      const s = spielRef.current;
      if (!s || s.ende || s.sperre) return;
      const ziel = s.reihenfolge[s.nummer];
      if (s.ergebnis[id]) return melden('info', namen.get(id)); // schon gelöst: nur Name zeigen
      if (!namen.has(id)) return;

      if (id === ziel) {
        klang('richtig');
        setRueckmeldung(null);
        setEffekt(null);
        setSpiel(weiter({ ...s, ergebnis: { ...s.ergebnis, [ziel]: s.fehl === 0 ? 'gruen' : 'gelb' } }));
        return;
      }

      klang('falsch');
      const fehl = s.fehl + 1;
      setEffekt({ id, art: 'daneben' });
      spaeter('effekt', () => setEffekt(null), 650);
      if (fehl < VERSUCHE) {
        setSpiel({ ...s, fehl });
        melden('falsch', namen.get(id));
        return;
      }

      // Dritter Fehlversuch: Gesuchtes rot aufdecken, kurz zeigen, dann weiter
      setSpiel({ ...s, fehl, sperre: true, ergebnis: { ...s.ergebnis, [ziel]: 'rot' } });
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
    },
    [melden, namen, spaeter, t, weiter],
  );

  const ergebnis = spiel?.ergebnis ?? {};
  const fertig = Boolean(spiel?.ende);
  const anzahl = spiel?.reihenfolge.length ?? 0;
  const zaehlen = (farbe) => Object.values(ergebnis).filter((w) => w === farbe).length;
  const zahlen = { gruen: zaehlen('gruen'), gelb: zaehlen('gelb'), rot: zaehlen('rot') };

  return {
    spiel,
    starten,
    klick,
    rueckmeldung,
    effekt,
    ergebnis,
    fertig,
    anzahl,
    zahlen,
    ziel: spiel && !fertig ? spiel.reihenfolge[spiel.nummer] : null,
    zielName: spiel && !fertig ? namen.get(spiel.reihenfolge[spiel.nummer]) : null,
    quote: fertig ? quote(ergebnis, anzahl) : null,
    sekunden: fertig ? Math.max(1, Math.round((spiel.ende - spiel.start) / 1000)) : null,
    namen,
  };
}
