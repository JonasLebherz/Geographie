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
 *  - „Weiß ich nicht“ (ueberspringen) deckt sofort rot auf – statt dreimal zu raten.
 *  - Joker (jokerZiehen): zeigt das Bild zur gesuchten Einheit als Hinweis; ein Treffer zählt dann
 *    höchstens gelb. JOKER_JE_RUNDE je Runde (Party: einstellbar).
 *  - Klicks auf schon gelöste Gebiete zählen nicht, zeigen aber deren Namen.
 *  - Wertung: grün voll, gelb halb → Prozent. Bei Gleichstand entscheidet die Zeit.
 *  - Serie: Treffer beim ersten Versuch am Stück (jeder Fehlversuch beendet sie).
 *  - impuls: zählt bei jedem Ereignis hoch ({ art: 'richtig' | 'falsch' | 'aufgedeckt', n }) –
 *    damit die Frage-Kapsel kurz aufleuchtet bzw. wackelt.
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

export function mischen(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

/** Sterne nach Ergebnis: ab 50 % einer, ab 75 % zwei, ab 90 % drei */
export const sterneFuer = (prozent) => (prozent >= 90 ? 3 : prozent >= 75 ? 2 : prozent >= 50 ? 1 : 0);

/** Trefferquote in Prozent: grün voll, gelb halb */
export function quote(ergebnis, anzahl) {
  const werte = Object.values(ergebnis);
  const gruen = werte.filter((w) => w === 'gruen').length;
  const gelb = werte.filter((w) => w === 'gelb').length;
  return Math.round((100 * (gruen + gelb / 2)) / anzahl);
}

/**
 * einheiten:   [{ id, name, en, … }] – alles, was auf der Karte anklickbar ist
 *              (Einheiten mit gefragt === false sind anklickbar, werden aber nicht gefragt,
 *              z. B. Kreise ohne eigenes Kfz-Kennzeichen)
 * runde:       wie viele davon in einer Runde gefragt werden
 * bestenliste: Schlüssel für Bestwert und Bestenliste
 * reihenfolge: feste Fragen (Party: beide Spieler dieselben) – sonst zufällig
 * gesteuert:   Party-Duell – nach jeder Frage wird gewartet (wartet = true), bis von außen
 *              naechste() kommt (beide fertig oder Zeit um). onFrageFertig({ nummer, farbe })
 *              meldet, wenn die eigene Frage erledigt ist. zeitUm() wertet die offene Frage als rot.
 */
export const JOKER_JE_RUNDE = 3;

export function useQuizRunde({
  einheiten, runde, bestenliste, reihenfolge: festeReihenfolge, gesteuert = false, onFrageFertig, joker: jokerAnzahl = JOKER_JE_RUNDE,
}) {
  const t = useT();
  const namen = useMemo(() => new Map(einheiten.map((e) => [e.id, t.ortsname(e)])), [einheiten, t]);
  const [spiel, setSpiel] = useState(null);
  const [rueckmeldung, setRueckmeldung] = useState(null); // { art, text, schluessel }
  const [effekt, setEffekt] = useState(null); // { id, art: 'daneben' | 'puls' }
  const [impuls, setImpuls] = useState(null); // { art, n }
  const anstossen = useCallback((art) => setImpuls((alt) => ({ art, n: (alt?.n ?? 0) + 1 })), []);
  const timer = useRef({});
  const spielRef = useRef(null);
  spielRef.current = spiel;
  const fertigRef = useRef(onFrageFertig);
  fertigRef.current = onFrageFertig;

  const spaeter = useCallback((name, fn, ms) => {
    clearTimeout(timer.current[name]);
    timer.current[name] = setTimeout(fn, ms);
  }, []);

  const starten = useCallback(() => {
    Object.values(timer.current).forEach(clearTimeout);
    // Feste Reihenfolge (Party: beide Spieler bekommen dieselben Fragen) oder zufällig
    const fragbar = einheiten.filter((e) => e.gefragt !== false);
    const ids = festeReihenfolge ?? mischen(fragbar.map((e) => e.id)).slice(0, Math.min(runde, fragbar.length));
    setSpiel({ reihenfolge: ids, nummer: 0, fehl: 0, ergebnis: {}, start: Date.now(), ende: 0, sperre: false, serie: 0, besteSerie: 0, joker: {} });
    setRueckmeldung(null);
    setEffekt(null);
  }, [einheiten, runde, festeReihenfolge]);

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
      if (!gesteuert) bestwertSpeichern(bestenliste, quote(stand.ergebnis, stand.reihenfolge.length), sekunden);
      setTimeout(() => klang('fertig'), 250);
      return { ...stand, nummer, fehl: 0, sperre: false, ende };
    },
    [bestenliste, gesteuert],
  );

  /** Duell: Frage erledigt – warten statt weiter, und melden */
  const erledigt = useCallback((stand, farbe) => {
    setSpiel({ ...stand, sperre: true, wartet: true });
    fertigRef.current?.({ nummer: stand.nummer, farbe });
  }, []);

  /** Gesuchtes rot aufdecken (nach dem dritten Fehlversuch oder „Weiß ich nicht“), kurz zeigen, dann weiter */
  const aufdecken = useCallback(
    (s, text) => {
      const ziel = s.reihenfolge[s.nummer];
      const aufgedeckt = { ...s, serie: 0, sperre: true, ergebnis: { ...s.ergebnis, [ziel]: 'rot' } };
      melden('aufgedeckt', text);
      klang('aufgedeckt');
      spaeter('effekt', () => setEffekt({ id: ziel, art: 'puls' }), 0);
      if (gesteuert) {
        erledigt(aufgedeckt, 'rot');
        return;
      }
      setSpiel(aufgedeckt);
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
    [erledigt, gesteuert, melden, spaeter, weiter],
  );

  /** Joker: zeigt das Bild zur Frage – ein Treffer zählt dann höchstens gelb */
  const jokerZiehen = useCallback(() => {
    const s = spielRef.current;
    if (!s || s.ende || s.sperre || s.joker?.[s.nummer]) return;
    if (Object.keys(s.joker ?? {}).length >= jokerAnzahl) return;
    setSpiel({ ...s, joker: { ...s.joker, [s.nummer]: true } });
  }, [jokerAnzahl]);

  /** „Weiß ich nicht“: zählt als falsch (rot), das Gesuchte wird sofort gezeigt */
  const ueberspringen = useCallback(() => {
    const s = spielRef.current;
    if (!s || s.ende || s.sperre) return;
    anstossen('aufgedeckt');
    aufdecken(s, t('Übersprungen'));
  }, [anstossen, aufdecken, t]);

  const klick = useCallback(
    (id) => {
      const s = spielRef.current;
      if (!s || s.ende || s.sperre) return;
      const ziel = s.reihenfolge[s.nummer];
      if (s.ergebnis[id]) return melden('info', namen.get(id)); // schon gelöst: nur Name zeigen
      if (!namen.has(id)) return;

      if (id === ziel) {
        klang('richtig');
        anstossen('richtig');
        setRueckmeldung(null);
        setEffekt(null);
        const mitJoker = Boolean(s.joker?.[s.nummer]);
        const serie = s.fehl === 0 && !mitJoker ? s.serie + 1 : 0;
        const farbe = s.fehl === 0 && !mitJoker ? 'gruen' : 'gelb';
        const neu = { ...s, serie, besteSerie: Math.max(s.besteSerie, serie), ergebnis: { ...s.ergebnis, [ziel]: farbe } };
        if (gesteuert) erledigt(neu, farbe);
        else setSpiel(weiter(neu));
        return;
      }

      const fehl = s.fehl + 1;
      if (fehl < VERSUCHE) klang('falsch');
      anstossen(fehl < VERSUCHE ? 'falsch' : 'aufgedeckt');
      setEffekt({ id, art: 'daneben' });
      spaeter('effekt', () => setEffekt(null), 650);
      if (fehl < VERSUCHE) {
        setSpiel({ ...s, fehl, serie: 0 });
        melden('falsch', namen.get(id));
        return;
      }

      aufdecken({ ...s, fehl }, t('Aufgedeckt'));
    },
    [anstossen, aufdecken, melden, namen, spaeter, t, weiter, erledigt, gesteuert],
  );

  /** Duell: nächste Frage (beide fertig oder Zeit um) */
  const naechste = useCallback(() => {
    const s = spielRef.current;
    if (!s || s.ende) return;
    clearTimeout(timer.current.effekt);
    setEffekt(null);
    setRueckmeldung(null);
    setSpiel(weiter({ ...s, wartet: false }));
  }, [weiter]);

  /** Duell: Zeit abgelaufen – offene Frage zählt als rot und wird aufgedeckt */
  const zeitUm = useCallback(() => {
    const s = spielRef.current;
    if (!s || s.ende || s.wartet) return;
    const ziel = s.reihenfolge[s.nummer];
    klang('aufgedeckt');
    anstossen('aufgedeckt');
    melden('aufgedeckt', t('Zeit um'));
    setEffekt({ id: ziel, art: 'puls' });
    erledigt({ ...s, serie: 0, ergebnis: { ...s.ergebnis, [ziel]: 'rot' } }, 'rot');
  }, [anstossen, erledigt, melden, t]);

  const ergebnis = spiel?.ergebnis ?? {};
  const fertig = Boolean(spiel?.ende);
  const anzahl = spiel?.reihenfolge.length ?? 0;
  const zaehlen = (farbe) => Object.values(ergebnis).filter((w) => w === farbe).length;
  const zahlen = { gruen: zaehlen('gruen'), gelb: zaehlen('gelb'), rot: zaehlen('rot') };

  return {
    spiel,
    starten,
    klick,
    ueberspringen,
    jokerZiehen,
    jokerAktiv: Boolean(spiel && !spiel.ende && spiel.joker?.[spiel.nummer]),
    jokerRest: Math.max(0, jokerAnzahl - Object.keys(spiel?.joker ?? {}).length),
    rueckmeldung,
    effekt,
    impuls,
    naechste,
    zeitUm,
    wartet: Boolean(spiel?.wartet),
    serie: spiel?.serie ?? 0,
    besteSerie: spiel?.besteSerie ?? 0,
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
