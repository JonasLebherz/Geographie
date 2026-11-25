/**
 * lib/einstellungen-start.js – Namen und Standardwerte der Einstellungen + Start-Skript
 *
 * Bewusst KEINE Client-Datei: Das Layout (Server) braucht START_SKRIPT als echten Text.
 * Die Einstellungen selbst liest und schreibt lib/einstellungen.js.
 */
export const STANDARD = { darstellung: 'hell', ton: 'an', lautstaerke: 0.7, sprache: 'de', ansicht: 'karte', stil: 'comic', avatar: '' };

/** Gestaltungen (app/stile.css): Comic Pixel (Standard), Atlas (die frühere), alte Seekarte */
export const STILE = ['comic', 'atlas', 'seekarte'];

export const SCHLUESSEL = {
  darstellung: 'geo-quiz-darstellung',
  ton: 'geo-quiz-ton',
  lautstaerke: 'geo-quiz-lautstaerke',
  sprache: 'geo-quiz-sprache',
  ansicht: 'geo-quiz-ansicht', // Karte oder Satellit
  stil: 'geo-quiz-stil', // Gestaltung: comic | atlas | seekarte
  avatar: 'geo-quiz-avatar', // Comic-Figur (components/Avatar.js), leer = noch keine
};

/** Läuft im <head> vor React: setzt data-theme, data-stil und lang, damit nichts aufblitzt. */
export const START_SKRIPT = `(function(){try{
var d=localStorage.getItem('${SCHLUESSEL.darstellung}')||'${STANDARD.darstellung}';
var s=localStorage.getItem('${SCHLUESSEL.sprache}')||'${STANDARD.sprache}';
var st=localStorage.getItem('${SCHLUESSEL.stil}');if(${JSON.stringify(STILE)}.indexOf(st)<0)st='${STANDARD.stil}';
document.documentElement.setAttribute('data-stil',st);
var dunkel=d==='dunkel'||(d==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.setAttribute('data-theme',dunkel?'dark':'light');
document.documentElement.setAttribute('lang',s);
}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.setAttribute('data-stil','${STANDARD.stil}');}})();`;
