'use client';
/**
 * components/karte/useDistanzRunde.js – Spiel-Logik „Am nächsten dran“
 *
 * Gefragt ist ein Ort (höchster Gipfel, Herkunft eines Gerichts, Geburtsort …). Ein Klick
 * irgendwohin auf die Karte ist die Antwort: Die Entfernung zum richtigen Ort ergibt die Punkte,
 * 1000 für einen Volltreffer, mit wachsender Entfernung weniger (1000 · e^(−km / skala)).
 * skala hängt vom Gebiet ab (ein Zehntel der Kartendiagonale), damit Welt und Bundesland gleich
 * schwer sind. Bei Fragen nach einem Gebiet (meiste Einwohner) zählt ein Klick hinein voll.
 *
 * Nach dem Klick erscheinen Linie, Ziel und Entfernung; weiter geht es nach einer Pause oder
 * mit dem nächsten Klick. Wertung der Runde in Prozent (Summe / Höchstpunktzahl) – wie bei den
 * anderen Quizzen, damit Bestwerte und Bestenliste gleich funktionieren.
 * Farben für Fortschritt und Marken: grün ab 750 Punkten, gelb ab 350, sonst rot.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { mischen } from './useQuizRunde';
import { klang } from '@/lib/ton';
import { bestwertSpeichern } from '@/lib/bestwerte';

const PAUSE = 2600;
export const HOECHST = 1000;

/** Kartenkoordinaten → Länge/Breite (Mercator, Parameter aus karte.projektionen) */
export function zuLonLat([x, y], projektionen) {
  const passend =
    projektionen.slice(1).find(({ rechteck: [x0, y0, x1, y1] }) => x >= x0 && x <= x1 && y >= y0 && y <= y1) ?? projektionen[0];
  const { l0, k, tx, ty } = passend;
  const lon = l0 + ((x - tx) / k) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp((ty - y) / k)) - Math.PI / 2) * (180 / Math.PI);
  return [((lon + 540) % 360) - 180, lat];
}

/** Großkreis-Entfernung in km */
export function entfernung([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const farbeFuer = (punkte) => (punkte >= 750 ? 'gruen' : punkte >= 350 ? 'gelb' : 'rot');

export function useDistanzRunde({ einheiten, runde, skala, projektionen, bestenliste }) {
  const [spiel, setSpiel] = useState(null); // { reihenfolge, nummer, antworten: { id: { km, punkte, klick } }, start, ende, zeigt }
  const spielRef = useRef(null);
  spielRef.current = spiel;
  const timer = useRef(null);
  const nachId = new Map(einheiten.map((e) => [e.id, e]));

  const starten = useCallback(() => {
    clearTimeout(timer.current);
    const ids = mischen(einheiten.map((e) => e.id)).slice(0, Math.min(runde, einheiten.length));
    setSpiel({ reihenfolge: ids, nummer: 0, antworten: {}, start: Date.now(), ende: 0, zeigt: false });
  }, [einheiten, runde]);

  useEffect(() => {
    starten();
    return () => clearTimeout(timer.current);
  }, [starten]);

  const weiter = useCallback(() => {
    clearTimeout(timer.current);
    const s = spielRef.current;
    if (!s || s.ende || !s.zeigt) return;
    const nummer = s.nummer + 1;
    if (nummer < s.reihenfolge.length) {
      setSpiel({ ...s, nummer, zeigt: false });
      return;
    }
    const ende = Date.now();
    const summe = Object.values(s.antworten).reduce((n, a) => n + a.punkte, 0);
    const quote = Math.round((100 * summe) / (HOECHST * s.reihenfolge.length));
    bestwertSpeichern(bestenliste, quote, Math.max(1, Math.round((ende - s.start) / 1000)));
    setTimeout(() => klang('fertig'), 250);
    setSpiel({ ...s, nummer, zeigt: false, ende });
  }, [bestenliste]);

  /** Klick auf die Karte: [x, y] in Kartenkoordinaten, flaeche = angeklickte Fläche (oder null) */
  const klick = useCallback(
    (xy, flaeche) => {
      const s = spielRef.current;
      if (!s || s.ende) return;
      if (s.zeigt) {
        weiter(); // Auflösung wird gezeigt: Klick geht direkt weiter
        return;
      }
      const ziel = nachId.get(s.reihenfolge[s.nummer]);
      const km = ziel.flaeche && flaeche === ziel.flaeche ? 0 : entfernung(zuLonLat(xy, projektionen), [ziel.lon, ziel.lat]);
      const punkte = Math.round(HOECHST * Math.exp(-km / skala));
      const farbe = farbeFuer(punkte);
      klang(farbe === 'rot' ? 'falsch' : 'richtig');
      setSpiel({ ...s, zeigt: true, antworten: { ...s.antworten, [ziel.id]: { km, punkte, farbe, klick: xy } } });
      timer.current = setTimeout(weiter, PAUSE);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [einheiten, projektionen, skala, weiter],
  );

  const antworten = spiel?.antworten ?? {};
  const fertig = Boolean(spiel?.ende);
  const anzahl = spiel?.reihenfolge.length ?? 0;
  const summe = Object.values(antworten).reduce((n, a) => n + a.punkte, 0);
  const zaehlen = (farbe) => Object.values(antworten).filter((a) => a.farbe === farbe).length;
  const zielId = spiel && !fertig ? spiel.reihenfolge[spiel.nummer] : null;
  return {
    spiel,
    starten,
    klick,
    weiter,
    antworten,
    fertig,
    anzahl,
    summe,
    zahlen: { gruen: zaehlen('gruen'), gelb: zaehlen('gelb'), rot: zaehlen('rot') },
    ziel: zielId ? nachId.get(zielId) : null,
    zeigt: Boolean(spiel?.zeigt),
    letzte: zielId && antworten[zielId] ? antworten[zielId] : null,
    quote: fertig ? Math.round((100 * summe) / (HOECHST * anzahl)) : null,
    sekunden: fertig ? Math.max(1, Math.round((spiel.ende - spiel.start) / 1000)) : null,
  };
}
