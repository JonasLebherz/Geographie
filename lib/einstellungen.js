'use client';
/**
 * lib/einstellungen.js – Einstellungen des Nutzers (nur in diesem Browser, localStorage)
 *
 *   darstellung: 'hell' (Standard) | 'dunkel' | 'auto' (wie das Betriebssystem)
 *   ton:         'an' (Standard) | 'aus'
 *   lautstaerke: 0 … 1 (Standard 0,7)
 *   sprache:     'de' (Standard) | 'en'
 *   ansicht:     'karte' (Standard) | 'satellit'
 *
 * Alle Komponenten lesen die Werte über useEinstellung(name) und bleiben so gleich,
 * egal wo umgeschaltet wird (Profil-Menü, Ton-Knopf im Spiel).
 *
 * Hell/Dunkel und Sprache setzt zusätzlich ein kleines Skript im <head> (START_SKRIPT in
 * einstellungen-start.js) schon vor dem ersten Anzeigen – sonst blitzte die Seite kurz im
 * falschen Modus auf.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { SCHLUESSEL, STANDARD } from './einstellungen-start';

const zuhoerer = new Set();

/** Liest eine Einstellung (im Browser), sonst den Standardwert. */
export function einstellung(name) {
  try {
    const wert = localStorage.getItem(SCHLUESSEL[name]);
    if (wert === null) return STANDARD[name];
    return name === 'lautstaerke' ? Math.min(1, Math.max(0, Number(wert))) : wert;
  } catch {
    return STANDARD[name];
  }
}

/** Ist dunkel gerade aktiv (auch bei „auto“)? */
function istDunkel(darstellung) {
  if (darstellung === 'dunkel') return true;
  if (darstellung === 'auto') return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return false;
}

/** Überträgt Darstellung und Sprache auf <html> (data-theme, lang). */
export function aufSeiteAnwenden() {
  const html = document.documentElement;
  html.setAttribute('data-theme', istDunkel(einstellung('darstellung')) ? 'dark' : 'light');
  html.setAttribute('lang', einstellung('sprache'));
}

export function einstellungSetzen(name, wert) {
  try {
    localStorage.setItem(SCHLUESSEL[name], String(wert));
  } catch {
    /* privates Fenster – dann gilt die Einstellung nur bis zum Neuladen nicht */
  }
  if (name === 'darstellung' || name === 'sprache') aufSeiteAnwenden();
  zuhoerer.forEach((melden) => melden());
}

function abonnieren(melden) {
  zuhoerer.add(melden);
  // Bei „auto“ dem Betriebssystem folgen, wenn es umschaltet
  const medien = window.matchMedia('(prefers-color-scheme: dark)');
  const systemWechsel = () => {
    if (einstellung('darstellung') === 'auto') aufSeiteAnwenden();
  };
  medien.addEventListener('change', systemWechsel);
  // Änderungen aus einem anderen Tab übernehmen
  const anderesFenster = () => {
    aufSeiteAnwenden();
    melden();
  };
  window.addEventListener('storage', anderesFenster);
  return () => {
    zuhoerer.delete(melden);
    medien.removeEventListener('change', systemWechsel);
    window.removeEventListener('storage', anderesFenster);
  };
}

/**
 * Hook: [wert, setzen]. Auf dem Server und beim ersten Zeichnen im Browser gilt der
 * Standardwert (sonst passten Server- und Browser-HTML nicht zusammen), direkt danach
 * der gespeicherte Wert.
 */
export function useEinstellung(name) {
  const wert = useSyncExternalStore(
    abonnieren,
    () => einstellung(name),
    () => STANDARD[name],
  );
  const setzen = useCallback((neu) => einstellungSetzen(name, neu), [name]);
  return [wert, setzen];
}
