'use client';
/**
 * lib/ton.js – dezente Töne für richtig, falsch, aufgedeckt und fertig
 *
 * Die Töne werden im Browser erzeugt (Web Audio API), es gibt keine Audiodateien.
 * Jeder Ton ist kurz, leise und weich ein- und ausgeblendet – eher ein „Klick“
 * mit Tonhöhe als eine Melodie:
 *  - richtig:    zwei helle Töne aufwärts (Quinte), wie ein leises Glockenspiel
 *  - falsch:     ein tiefer, gedämpfter Ton, der leicht nach unten fällt
 *  - aufgedeckt: „Fail“ – absteigende Posaune (wah-wah-wah-waaah), nach drei Fehlversuchen
 *  - fertig:     kurzer Dur-Akkord nacheinander
 *  - rein/raus:  leises „Wusch“ bei Kamerafahrten der Karte (wie in Instandhaltung): Rauschen durch
 *                einen Bandpass, der beim Hineinzoomen nach oben, beim Herauszoomen nach unten wandert
 *
 * Ton an/aus und Lautstärke kommen aus den Einstellungen (lib/einstellungen.js,
 * Profil-Menü oben rechts bzw. Lautsprecher-Knopf im Spiel).
 * Browser erlauben Ton erst nach einer Nutzeraktion – der AudioContext wird deshalb
 * erst beim ersten Ton (also nach einem Klick) angelegt.
 */
import { einstellung } from './einstellungen';

const GRUND_LAUTSTAERKE = 0.7; // bei Lautstärke 100 % – die Töne bleiben auch dann leise

let kontext = null;
let ausgang = null;

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

let rauschen = null;

/** „Wusch“: Rauschen durch einen wandernden Bandpass-Filter */
function wusch(ctx, von, bis, dauer = 0.85, lautstaerke = 0.5) {
  if (!rauschen) {
    rauschen = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const daten = rauschen.getChannelData(0);
    for (let i = 0; i < daten.length; i += 1) daten[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime;
  const quelle = ctx.createBufferSource();
  quelle.buffer = rauschen;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(von, t0);
  filter.frequency.exponentialRampToValueAtTime(bis, t0 + dauer);
  const huelle = ctx.createGain();
  huelle.gain.setValueAtTime(0.0001, t0);
  huelle.gain.exponentialRampToValueAtTime(lautstaerke * 0.18, t0 + dauer * 0.35);
  huelle.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  quelle.connect(filter).connect(huelle).connect(ausgang);
  quelle.start(t0);
  quelle.stop(t0 + dauer + 0.05);
}

/** Ein Posaunenton: Sägezahn durch Tiefpass, leicht gleitend; der letzte mit Vibrato */
function posaune(ctx, frequenz, start, dauer, vibrato) {
  const t0 = ctx.currentTime + start;
  const osz = ctx.createOscillator();
  osz.type = 'sawtooth';
  osz.frequency.setValueAtTime(frequenz * 1.03, t0);
  osz.frequency.exponentialRampToValueAtTime(frequenz, t0 + 0.06);
  if (vibrato) {
    osz.frequency.exponentialRampToValueAtTime(frequenz * 0.94, t0 + dauer);
    const lfo = ctx.createOscillator();
    const tiefe = ctx.createGain();
    lfo.frequency.value = 6;
    tiefe.gain.value = frequenz * 0.025;
    lfo.connect(tiefe).connect(osz.frequency);
    lfo.start(t0 + 0.15);
    lfo.stop(t0 + dauer);
  }
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1100;
  filter.Q.value = 2;
  const huelle = ctx.createGain();
  huelle.gain.setValueAtTime(0.0001, t0);
  huelle.gain.exponentialRampToValueAtTime(0.13, t0 + 0.04);
  huelle.gain.setValueAtTime(0.13, t0 + dauer * 0.7);
  huelle.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  osz.connect(filter).connect(huelle).connect(ausgang);
  osz.start(t0);
  osz.stop(t0 + dauer + 0.05);
}

const KLAENGE = {
  rein(ctx) {
    wusch(ctx, 320, 2000);
  },
  raus(ctx) {
    wusch(ctx, 1800, 320);
  },
  richtig(ctx) {
    ton(ctx, { frequenz: 659.3, dauer: 0.16, lautstaerke: 0.16 });
    ton(ctx, { frequenz: 1318.5, dauer: 0.1, lautstaerke: 0.03 }); // Oberton für den Glockenklang
    ton(ctx, { frequenz: 987.8, start: 0.075, dauer: 0.26, lautstaerke: 0.16 });
    ton(ctx, { frequenz: 1975.5, start: 0.075, dauer: 0.12, lautstaerke: 0.025 });
  },
  falsch(ctx) {
    ton(ctx, { frequenz: 210, bis: 150, dauer: 0.16, lautstaerke: 0.22, form: 'triangle' });
  },
  // „Fail“ nach drei Fehlversuchen: absteigende Posaune („wah-wah-wah-waaah“), weich gefiltert
  aufgedeckt(ctx) {
    const noten = [
      [392, 0, 0.26],
      [370, 0.27, 0.26],
      [349.2, 0.54, 0.26],
      [329.6, 0.81, 0.75],
    ];
    for (const [frequenz, start, dauer] of noten) posaune(ctx, frequenz, start, dauer, start > 0.8);
  },

  fertig(ctx) {
    [523.3, 659.3, 784, 1046.5].forEach((frequenz, i) =>
      ton(ctx, { frequenz, start: i * 0.085, dauer: 0.42 - i * 0.04, lautstaerke: 0.12 }),
    );
  },
};

/**
 * Spielt einen Klang ("richtig", "falsch", "aufgedeckt", "fertig") – außer bei Ton aus.
 * immer: auch bei Ton aus spielen (Probeklang beim Einstellen der Lautstärke)
 */
export function klang(name, { immer = false } = {}) {
  if (!immer && einstellung('ton') === 'aus') return;
  const lautstaerke = einstellung('lautstaerke');
  if (lautstaerke <= 0) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    // Quadratisch, damit der Regler sich gleichmäßig anfühlt (das Ohr hört logarithmisch)
    ausgang.gain.setValueAtTime(GRUND_LAUTSTAERKE * lautstaerke ** 2, ctx.currentTime);
    KLAENGE[name]?.(ctx);
  } catch {
    /* Ton ist Beiwerk – Fehler dürfen das Spiel nie stören */
  }
}
