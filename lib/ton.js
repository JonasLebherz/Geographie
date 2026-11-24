'use client';
/**
 * lib/ton.js – dezente Töne für richtig, falsch, aufgedeckt und fertig
 *
 * Die Töne werden im Browser erzeugt (Web Audio API), es gibt keine Audiodateien.
 * Jeder Ton ist kurz, leise und weich ein- und ausgeblendet – eher ein „Klick“
 * mit Tonhöhe als eine Melodie:
 *  - richtig:    zwei helle Töne aufwärts (Quinte), wie ein leises Glockenspiel
 *  - falsch:     ein tiefer, gedämpfter Ton, der leicht nach unten fällt
 *  - aufgedeckt: zwei weiche Töne abwärts
 *  - fertig:     kurzer Dur-Akkord nacheinander
 *
 * Ob der Ton an ist, steht in localStorage unter „geo-quiz-ton“ ("aus" = stumm).
 * Browser erlauben Ton erst nach einer Nutzeraktion – der AudioContext wird deshalb
 * erst beim ersten Ton (also nach einem Klick) angelegt.
 */
import { useCallback, useSyncExternalStore } from 'react';

const SPEICHER = 'geo-quiz-ton';
const LAUTSTAERKE = 0.5;

let kontext = null;
let ausgang = null;
const zuhoerer = new Set();

function istStumm() {
  try {
    return localStorage.getItem(SPEICHER) === 'aus';
  } catch {
    return false;
  }
}

function audio() {
  if (typeof window === 'undefined') return null;
  if (!kontext) {
    const Klasse = window.AudioContext || window.webkitAudioContext;
    if (!Klasse) return null;
    kontext = new Klasse();
    // Gesamtlautstärke und ein sanfter Tiefpass, damit nichts schrill klingt
    const filter = kontext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 5200;
    ausgang = kontext.createGain();
    ausgang.gain.value = LAUTSTAERKE;
    ausgang.connect(filter).connect(kontext.destination);
  }
  if (kontext.state === 'suspended') kontext.resume();
  return kontext;
}

/**
 * Ein einzelner Ton mit weichem Ein- und Ausklang.
 * frequenz → bis (optional, Tonhöhe gleitet), start/dauer in Sekunden, form = Wellenform.
 */
function ton(ctx, { frequenz, bis, start = 0, dauer = 0.18, lautstaerke = 0.2, form = 'sine' }) {
  const t0 = ctx.currentTime + start;
  const osz = ctx.createOscillator();
  const huelle = ctx.createGain();
  osz.type = form;
  osz.frequency.setValueAtTime(frequenz, t0);
  if (bis) osz.frequency.exponentialRampToValueAtTime(bis, t0 + dauer);
  huelle.gain.setValueAtTime(0.0001, t0);
  huelle.gain.exponentialRampToValueAtTime(lautstaerke, t0 + 0.008);
  huelle.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  osz.connect(huelle).connect(ausgang);
  osz.start(t0);
  osz.stop(t0 + dauer + 0.02);
}

const KLAENGE = {
  richtig(ctx) {
    ton(ctx, { frequenz: 659.3, dauer: 0.16, lautstaerke: 0.16 });
    ton(ctx, { frequenz: 1318.5, dauer: 0.1, lautstaerke: 0.03 }); // Oberton für den Glockenklang
    ton(ctx, { frequenz: 987.8, start: 0.075, dauer: 0.26, lautstaerke: 0.16 });
    ton(ctx, { frequenz: 1975.5, start: 0.075, dauer: 0.12, lautstaerke: 0.025 });
  },
  falsch(ctx) {
    ton(ctx, { frequenz: 210, bis: 150, dauer: 0.16, lautstaerke: 0.22, form: 'triangle' });
  },
  aufgedeckt(ctx) {
    ton(ctx, { frequenz: 440, dauer: 0.22, lautstaerke: 0.13, form: 'triangle' });
    ton(ctx, { frequenz: 329.6, start: 0.16, dauer: 0.36, lautstaerke: 0.13, form: 'triangle' });
  },
  fertig(ctx) {
    [523.3, 659.3, 784, 1046.5].forEach((frequenz, i) =>
      ton(ctx, { frequenz, start: i * 0.085, dauer: 0.42 - i * 0.04, lautstaerke: 0.12 }),
    );
  },
};

/** Spielt einen Klang ("richtig", "falsch", "aufgedeckt", "fertig") – außer bei Stumm. */
export function klang(name) {
  if (istStumm()) return;
  try {
    const ctx = audio();
    if (ctx) KLAENGE[name]?.(ctx);
  } catch {
    /* Ton ist Beiwerk – Fehler dürfen das Spiel nie stören */
  }
}

/** Hook: [stumm, umschalten] – mehrere Schalter auf einer Seite bleiben gleich. */
export function useStumm() {
  const stumm = useSyncExternalStore(
    (melden) => {
      zuhoerer.add(melden);
      return () => zuhoerer.delete(melden);
    },
    istStumm,
    () => false, // auf dem Server: Ton an
  );
  const umschalten = useCallback(() => {
    try {
      localStorage.setItem(SPEICHER, istStumm() ? 'an' : 'aus');
    } catch {
      /* privates Fenster – dann bleibt es beim Alten */
    }
    zuhoerer.forEach((melden) => melden());
  }, []);
  return [stumm, umschalten];
}
