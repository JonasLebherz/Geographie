'use client';
/**
 * lib/sprache/index.js – Oberfläche auf Deutsch oder Englisch
 *
 * Wie im Projekt Instandhaltung: Der deutsche Text ist der Schlüssel, die englische
 * Fassung steht in lib/sprache/en.js. Fehlt eine Übersetzung, bleibt der deutsche Text.
 * Fehlende Einträge findet `npm run texte`.
 *
 *  Client-Komponenten:  const t = useT();  t('Quizze'), t('{n} Länder', { n: 46 })
 *                       t.sprache ('de' | 'en'), t.ortsname(land) → Name in der gewählten Sprache
 *  Server-Komponenten:  <T>Quizze</T> bzw. <T text="{n} Länder" werte={{ n: 46 }} />
 *
 * Die Seiten werden beim Bauen fertig erzeugt (statisch). Die Sprache steht im Browser
 * (Einstellungen), deshalb wird hier im Browser übersetzt: Beim ersten Zeichnen kommt
 * Deutsch wie vom Server, direkt danach die gewählte Sprache.
 */
import { useMemo } from 'react';
import { useEinstellung } from '@/lib/einstellungen';
import EN from './en';

/** Übersetzt einen deutschen Text und setzt Platzhalter {name} ein. */
export function uebersetzen(sprache, text, werte) {
  let ergebnis = sprache === 'en' ? (EN[text] ?? text) : text;
  if (werte) ergebnis = ergebnis.replace(/\{(\w+)\}/g, (_, k) => (k in werte ? String(werte[k]) : `{${k}}`));
  return ergebnis;
}

export function useT() {
  const [sprache] = useEinstellung('sprache');
  return useMemo(() => {
    const t = (text, werte) => uebersetzen(sprache, text, werte);
    t.sprache = sprache;
    // Gebiete haben name (deutsch) und en (englisch)
    t.ortsname = (gebiet) => (sprache === 'en' && gebiet?.en) || gebiet?.name;
    // Zahlen mit Tausenderpunkt bzw. -komma
    t.zahl = (n) => n.toLocaleString(sprache === 'en' ? 'en-GB' : 'de-DE');
    return t;
  }, [sprache]);
}

/** Übersetzter Text für Server-Komponenten: <T>Quizze</T> oder <T text="{n} Länder" werte={{ n }} /> */
export function T({ text, children, werte }) {
  const t = useT();
  return t(text ?? children, werte);
}
